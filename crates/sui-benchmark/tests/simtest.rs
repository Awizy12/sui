// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

mod test {

    use std::str::FromStr;
    use std::sync::Arc;
    use std::time::Duration;
    use sui_benchmark::util::generate_all_gas_for_test;
    use sui_benchmark::workloads::delegation::DelegationWorkload;
    use sui_benchmark::workloads::shared_counter::SharedCounterWorkload;
    use sui_benchmark::workloads::transfer_object::TransferObjectWorkload;
    use sui_benchmark::workloads::WorkloadGasConfig;
    use sui_benchmark::{
        drivers::{bench_driver::BenchDriver, driver::Driver, Interval},
        util::get_ed25519_keypair_from_keystore,
        workloads::make_combination_workload,
        LocalValidatorAggregatorProxy, ValidatorProxy,
    };
    use sui_config::SUI_KEYSTORE_FILENAME;
    use sui_macros::sim_test;
    use sui_simulator::{configs::*, SimConfig};
    use sui_types::object::Owner;
    use test_utils::messages::get_sui_gas_object_with_wallet_context;
    use test_utils::network::{TestCluster, TestClusterBuilder};

    fn test_config() -> SimConfig {
        env_config(
            uniform_latency_ms(10..20),
            [
                (
                    "regional_high_variance",
                    bimodal_latency_ms(30..40, 300..800, 0.005),
                ),
                (
                    "global_high_variance",
                    bimodal_latency_ms(60..80, 500..1500, 0.01),
                ),
            ],
        )
    }

    fn get_var<T: FromStr>(name: &str, default: T) -> T
    where
        <T as FromStr>::Err: std::fmt::Debug,
    {
        std::env::var(name)
            .ok()
            .map(|v| v.parse().unwrap())
            .unwrap_or(default)
    }

    #[sim_test(config = "test_config()")]
    async fn test_simulated_load_with_reconfig() {
        let test_cluster = build_test_cluster(4, 10).await;
        test_simulated_load(test_cluster, 60).await;
    }

    #[sim_test(config = "test_config()")]
    async fn test_simulated_load_basic() {
        let test_cluster = build_test_cluster(7, 0).await;
        test_simulated_load(test_cluster, 15).await;
    }

    #[sim_test(config = "test_config()")]
    async fn test_simulated_load_restarts() {
        let test_cluster = build_test_cluster(4, 0).await;
        let node_restarter = test_cluster
            .random_node_restarter()
            .with_kill_interval_secs(5, 15)
            .with_restart_delay_secs(1, 10);
        node_restarter.run();
        test_simulated_load(test_cluster, 120).await;
    }

    #[sim_test(config = "test_config()")]
    async fn test_simulated_load_reconfig_restarts() {
        let test_cluster = build_test_cluster(4, 10).await;
        let node_restarter = test_cluster
            .random_node_restarter()
            .with_kill_interval_secs(5, 15)
            .with_restart_delay_secs(1, 10);
        node_restarter.run();
        test_simulated_load(test_cluster, 120).await;
    }

    async fn build_test_cluster(
        default_num_validators: usize,
        default_checkpoints_per_epoch: u64,
    ) -> Arc<TestCluster> {
        let mut builder = TestClusterBuilder::new().with_num_validators(get_var(
            "SIM_STRESS_TEST_NUM_VALIDATORS",
            default_num_validators,
        ));

        let checkpoints_per_epoch = get_var("CHECKPOINTS_PER_EPOCH", default_checkpoints_per_epoch);
        if checkpoints_per_epoch > 0 {
            builder = builder.with_checkpoints_per_epoch(checkpoints_per_epoch);
        }

        Arc::new(builder.build().await.unwrap())
    }

    async fn test_simulated_load(test_cluster: Arc<TestCluster>, test_duration_secs: u64) {
        let swarm = &test_cluster.swarm;
        let context = &test_cluster.wallet;
        let sender = test_cluster.get_address_0();
        let fullnode_rpc_url = &test_cluster.fullnode_handle.rpc_url;

        let keystore_path = swarm.dir().join(SUI_KEYSTORE_FILENAME);
        let ed25519_keypair =
            Arc::new(get_ed25519_keypair_from_keystore(keystore_path, &sender).unwrap());
        let all_gas = get_sui_gas_object_with_wallet_context(context, &sender).await;
        let (_, gas) = all_gas.get(0).unwrap();
        let (move_struct, pay_coin) = all_gas.get(1).unwrap();
        let primary_gas = (
            gas.clone(),
            Owner::AddressOwner(sender),
            ed25519_keypair.clone(),
        );
        let coin = (
            pay_coin.clone(),
            Owner::AddressOwner(sender),
            ed25519_keypair.clone(),
        );
        let coin_type_tag = move_struct.type_params[0].clone();

        let registry = prometheus::Registry::new();
        let proxy: Arc<dyn ValidatorProxy + Send + Sync> = Arc::new(
            LocalValidatorAggregatorProxy::from_network_config(
                swarm.config(),
                &registry,
                Some(fullnode_rpc_url),
            )
            .await,
        );

        // The default test parameters are somewhat conservative in order to keep the running time
        // of the test reasonable in CI.

        let target_qps = get_var("SIM_STRESS_TEST_QPS", 10);
        let num_workers = get_var("SIM_STRESS_TEST_WORKERS", 10);
        let in_flight_ratio = get_var("SIM_STRESS_TEST_IFR", 2);
        let max_ops = target_qps * in_flight_ratio;
        let num_shared_counters = max_ops;
        let shared_counter_workload_init_gas_config =
            SharedCounterWorkload::generate_coin_config_for_init(num_shared_counters);
        let shared_counter_workload_payload_gas_config =
            SharedCounterWorkload::generate_coin_config_for_payloads(max_ops);

        let (transfer_object_workload_tokens, transfer_object_workload_payload_gas_config) =
            TransferObjectWorkload::generate_coin_config_for_payloads(max_ops, 2, max_ops);
        let delegation_gas_configs = DelegationWorkload::generate_gas_config_for_payloads(max_ops);
        let (workload_init_gas, workload_payload_gas) = generate_all_gas_for_test(
            proxy.clone(),
            primary_gas,
            coin,
            coin_type_tag,
            WorkloadGasConfig {
                shared_counter_workload_init_gas_config,
                shared_counter_workload_payload_gas_config,
                transfer_object_workload_tokens,
                transfer_object_workload_payload_gas_config,
                delegation_gas_configs,
            },
        )
        .await
        .unwrap();
        let mut combination_workload = make_combination_workload(
            target_qps,
            num_workers,
            in_flight_ratio,
            2, // num transfer accounts
            1, // shared_counter_weight
            1, // transfer_object_weight
            1, // delegation_weight
            workload_payload_gas,
        );
        combination_workload
            .workload
            .init(workload_init_gas, proxy.clone())
            .await;

        let driver = BenchDriver::new(5);

        // Use 0 for unbounded
        let test_duration_secs = get_var("SIM_STRESS_TEST_DURATION_SECS", test_duration_secs);
        let test_duration = if test_duration_secs == 0 {
            Duration::MAX
        } else {
            Duration::from_secs(test_duration_secs)
        };
        let interval = Interval::Time(test_duration);

        let show_progress = interval.is_unbounded();
        let stats = driver
            .run(
                vec![combination_workload],
                proxy,
                &registry,
                show_progress,
                interval,
            )
            .await
            .unwrap();

        assert_eq!(stats.num_error, 0);
    }
}
