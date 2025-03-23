var Election = artifacts.require("./Election.sol");
var VoterAuth = artifacts.require("./VoterAuth.sol");

module.exports = function(deployer) {
    // Deploy VoterAuth first
    let voterAuthInstance;
    deployer.deploy(VoterAuth, web3.utils.toWei("0.1", "ether"))
        .then((instance) => {
            voterAuthInstance = instance;
            // Then deploy Election with VoterAuth's address
            return deployer.deploy(Election, voterAuthInstance.address);
        })
        .then((electionInstance) => {
            // Authorize the Election contract in VoterAuth
            return voterAuthInstance.authorizeElection(electionInstance.address);
        });
};
