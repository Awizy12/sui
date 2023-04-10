Skip to content
Awizy12
/
sui
Public
forked from MystenLabs/sui
Code
Pull requests
Actions
Projects
Wiki
Security
Insights
Settings
sui/docker/fullnode-x/README.md
@allan-bailey
allan-bailey feat: adding fullnode x docker compose example (MystenLabs#9637)
…
 1 contributor
21 lines (15 sloc)  1.03 KB
Build the containers locally to your desktop/laptop with:

docker compose build
The build process can take a while to complete.
First start postgres so you can create the DB with the diesel command:

docker compose up postgres -d
Note that postgres will store its db data in ./postgres/data
psql -U postgres -p 5432 -h localhost -c 'create database sui_indexer_testnet'
run these in sui.git/crates/sui-indexer:
diesel setup --database-url=postgres://postgres:admin@localhost:5432/sui_indexer_testnet
Copy the fullnode.yaml and genesis.blob files for the network to use and put them in the fullnode/config/ folder.

docker compose up fullnode -d

verify it's working by watching the logs with docker compose logs fullnode -f
Once the full node is working, then start indexer with: docker compose up indexer -d

You will see the indexer catching up checkpoint by checkpoint until it's up to date and ready to serve requests. docker compose logs indexer | tail -30
Footer
© 2023 GitHub, Inc.
Footer navigation
Terms
Privacy
Security
Status
Docs
Contact GitHub
Pricing
API
Training
Blog
About
sui/README.md at main · Awizy12/sui
