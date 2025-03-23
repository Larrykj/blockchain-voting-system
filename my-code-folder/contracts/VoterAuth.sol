pragma solidity ^0.5.0;

/**
 * @title VoterAuth
 * @dev Handles voter registration and verification with enhanced security
 */
contract VoterAuth {
    address public admin;
    uint256 public registrationFee;
    
    struct Voter {
        bytes32 idHash;           // Hash of government ID (first layer)
        bytes32 digitalSignature; // Second layer of verification
        bool isRegistered;        // Registration status
        bool hasVoted;            // Voting status
        uint registrationTime;    // When the voter was registered
    }
    
    // Mapping from voter's address to their data
    mapping(address => Voter) public voters;
    
    // Total number of registered voters
    uint public totalVoters;
    
    // Whitelisted election contracts that can check voter status
    mapping(address => bool) public authorizedElections;
    
    // Events
    event VoterRegistered(address indexed voterAddress, uint timestamp);
    event VoterStatusUpdated(address indexed voterAddress, bool isRegistered);
    event ElectionAuthorized(address indexed electionContract);
    event VoteCasted(address indexed voterAddress);
    event RegistrationFeeUpdated(uint256 newFee);
    event FeesWithdrawn(uint256 amount);
    
    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    modifier onlyAuthorizedElection() {
        require(authorizedElections[msg.sender], "Only authorized election contracts can call this function");
        _;
    }
    
    /**
     * @dev Constructor sets the admin and initial registration fee
     * @param _initialFee Initial registration fee in wei
     */
    constructor(uint256 _initialFee) public {
        admin = msg.sender;
        registrationFee = _initialFee;
    }
    
    /**
     * @dev Register a new voter with double hashing for privacy and security
     * @param _voterAddress Address of the voter
     * @param _idHash Hash of the government ID
     * @param _digitalSignature Second layer of security verification
     */
    function registerVoter(address _voterAddress, bytes32 _idHash, bytes32 _digitalSignature) 
        public 
        payable
    {
        require(msg.value == registrationFee, "Incorrect registration fee");
        require(!voters[_voterAddress].isRegistered, "Voter already registered");
        
        voters[_voterAddress] = Voter({
            idHash: _idHash,
            digitalSignature: _digitalSignature,
            isRegistered: true,
            hasVoted: false,
            registrationTime: now
        });
        
        totalVoters++;
        
        emit VoterRegistered(_voterAddress, now);
    }
    
    /**
     * @dev Update a voter's registration status
     * @param _voterAddress Address of the voter
     * @param _status New registration status
     */
    function updateVoterStatus(address _voterAddress, bool _status) 
        public 
        onlyAdmin 
    {
        require(voters[_voterAddress].idHash != bytes32(0), "Voter does not exist");
        
        voters[_voterAddress].isRegistered = _status;
        
        emit VoterStatusUpdated(_voterAddress, _status);
    }
    
    /**
     * @dev Authorize an election contract to check voter status
     * @param _electionAddress Address of the election contract
     */
    function authorizeElection(address _electionAddress) 
        public 
        onlyAdmin 
    {
        authorizedElections[_electionAddress] = true;
        
        emit ElectionAuthorized(_electionAddress);
    }
    
    /**
     * @dev Check if a voter is registered and has not voted
     * @param _voterAddress Address of the voter to check
     * @return bool indicating if voter is eligible to vote
     */
    function isEligibleToVote(address _voterAddress) 
        public 
        view 
        returns (bool) 
    {
        return voters[_voterAddress].isRegistered && !voters[_voterAddress].hasVoted;
    }
    
    /**
     * @dev Mark a voter as having voted (can only be called by authorized election)
     * @param _voterAddress Address of the voter
     */
    function markVoted(address _voterAddress) 
        public 
        onlyAuthorizedElection 
    {
        require(voters[_voterAddress].isRegistered, "Voter is not registered");
        require(!voters[_voterAddress].hasVoted, "Voter has already voted");
        
        voters[_voterAddress].hasVoted = true;
        
        emit VoteCasted(_voterAddress);
    }
    
    /**
     * @dev Verify a voter's identity using both hash layers
     * @param _voterAddress Address of the voter
     * @param _idHash Hash of the government ID for verification
     * @param _digitalSignature Second layer for verification
     * @return bool indicating if verification was successful
     */
    function verifyVoter(
        address _voterAddress, 
        bytes32 _idHash, 
        bytes32 _digitalSignature
    ) 
        public 
        view 
        returns (bool) 
    {
        Voter memory voter = voters[_voterAddress];
        return (voter.isRegistered && 
                voter.idHash == _idHash && 
                voter.digitalSignature == _digitalSignature);
    }
    
    /**
     * @dev Emergency function to transfer admin rights
     * @param _newAdmin Address of the new admin
     */
    function transferAdmin(address _newAdmin) 
        public 
        onlyAdmin 
    {
        require(_newAdmin != address(0), "New admin cannot be zero address");
        admin = _newAdmin;
    }
    
    /**
     * @dev Get voter registration time
     * @param _voterAddress Address of the voter
     * @return uint timestamp of registration
     */
    function getVoterRegistrationTime(address _voterAddress) 
        public 
        view 
        returns (uint) 
    {
        require(voters[_voterAddress].isRegistered, "Voter is not registered");
        return voters[_voterAddress].registrationTime;
    }
    
    /**
     * @dev Update registration fee
     * @param _newFee New registration fee in wei
     */
    function updateRegistrationFee(uint256 _newFee) 
        public 
        onlyAdmin 
    {
        registrationFee = _newFee;
        emit RegistrationFeeUpdated(_newFee);
    }
    
    /**
     * @dev Withdraw collected fees to admin address
     */
    function withdrawFees() 
        public 
        onlyAdmin 
    {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        (bool success, ) = admin.call.value(balance)("");
        require(success, "Transfer failed");
        
        emit FeesWithdrawn(balance);
    }
}
