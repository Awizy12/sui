// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useFeature } from '@growthbook/growthbook-react';
import { useMemo } from 'react';

import { getStakingRewards } from '../getStakingRewards';
import { StakeAmount } from '../home/StakeAmount';
import { useGetDelegatedStake } from '../useGetDelegatedStake';
import { STATE_OBJECT } from '../usePendingDelegation';
import { validatorsFields } from '../validatorsFields';
import { DelegationCard } from './../home/DelegationCard';
import BottomMenuLayout, {
    Menu,
    Content,
} from '_app/shared/bottom-menu-layout';
import Button from '_app/shared/button';
import { Card, CardItem } from '_app/shared/card';
import { Text } from '_app/shared/text';
import Alert from '_components/alert';
import Icon, { SuiIcons } from '_components/icon';
import LoadingIndicator from '_components/loading/LoadingIndicator';
import { useAppSelector, useGetObject } from '_hooks';
import { FEATURES } from '_src/shared/experimentation/features';

export function ValidatorsCard() {
    const accountAddress = useAppSelector(({ account }) => account.address);
    const {
        data: delegations,
        isLoading,
        isError,
        error,
    } = useGetDelegatedStake(accountAddress || '');

    const { data: validators } = useGetObject(STATE_OBJECT);

    const validatorsData = validators && validatorsFields(validators);

    const activeValidators =
        validatorsData?.validators.fields.active_validators;
    // Total earn token for all delegations
    const totalEarnToken = useMemo(() => {
        if (!delegations || !validatorsData) return 0;

        const activeValidators =
            validatorsData.validators.fields.active_validators;

        return delegations.reduce(
            (acc, delegation) =>
                acc + getStakingRewards(activeValidators, delegation),
            0
        );
    }, [delegations, validatorsData]);

    // Total active stake for all delegations

    const totalActivePendingStake = useMemo(() => {
        if (!delegations) return 0n;
        return delegations.reduce(
            (acc, { staked_sui }) => acc + BigInt(staked_sui.principal.value),
            0n
        );
    }, [delegations]);

    const numberOfValidators = useMemo(() => {
        if (!delegations) return 0;
        return [
            ...new Set(
                delegations.map(
                    ({ staked_sui }) => staked_sui.validator_address
                )
            ),
        ].length;
    }, [delegations]);

    const stakingEnabled = useFeature(FEATURES.STAKING_ENABLED).on;

    if (isLoading) {
        return (
            <div className="p-2 w-full flex justify-center items-center h-full">
                <LoadingIndicator />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-2 w-full flex justify-center items-center h-full">
                <Alert className="mb-2">
                    <strong>{error?.message}</strong>
                </Alert>
            </div>
        );
    }

    return (
        <div className="flex flex-col flex-nowrap h-full w-full">
            <BottomMenuLayout>
                <Content>
                    <div className="mb-4">
                        <Card
                            padding="none"
                            header={
                                <div className="py-2.5">
                                    <Text
                                        variant="captionSmall"
                                        weight="semibold"
                                        color="steel-darker"
                                    >
                                        Staking on {numberOfValidators}
                                        {numberOfValidators > 1
                                            ? ' Validators'
                                            : ' Validator'}
                                    </Text>
                                </div>
                            }
                        >
                            <div className="flex divide-x divide-solid divide-gray-45 divide-y-0">
                                <CardItem title="Your Stake">
                                    <StakeAmount
                                        balance={totalActivePendingStake}
                                        variant="heading4"
                                    />
                                </CardItem>
                                <CardItem title="Earned">
                                    <StakeAmount
                                        balance={totalEarnToken}
                                        variant="heading4"
                                        isEarnedRewards
                                    />
                                </CardItem>
                            </div>
                        </Card>

                        <div className="grid grid-cols-2 gap-2.5 mt-4">
                            {validatorsData &&
                                activeValidators &&
                                delegations.map((delegationObject) => (
                                    <DelegationCard
                                        delegationObject={delegationObject}
                                        activeValidators={activeValidators}
                                        currentEpoch={+validatorsData.epoch}
                                        key={delegationObject.staked_sui.id.id}
                                    />
                                ))}
                        </div>
                    </div>
                </Content>
                <Menu stuckClass="staked-cta" className="w-full px-0 pb-0 mx-0">
                    <Button
                        size="large"
                        mode="neutral"
                        href="new"
                        disabled={!stakingEnabled}
                        className="!text-steel-darker w-full"
                    >
                        <Icon
                            icon={SuiIcons.Plus}
                            className="text-body text-gray-65 font-normal"
                        />
                        Stake SUI
                    </Button>
                </Menu>
            </BottomMenuLayout>
        </div>
    );
}
