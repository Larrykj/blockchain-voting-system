pragma solidity ^0.5.0;

// Import the VoterAuth contract
import "./VoterAuth.sol";

contract Election {

    // Election manager
    address public manager;
    
    // Reference to the VoterAuth contract
    VoterAuth public voterAuth;
    
    // Election state
    bool public electionStarted;
    bool public electionEnded;
    uint public startTime;
    uint public endTime;

    struct Candidate {
        uint id;
        string CfirstName;
        string ClastName;
        string CidNumber;
        uint voteCount;
    }

    // Using voters mapping to track local record of who voted in this election
    mapping (address => bool) public voters;
    mapping (uint => Candidate) public candidates;
    uint public candidatesCount;

    event votedEvent (
        uint indexed_candidateId
    );
    
    event ElectionStarted(uint startTime);
    event ElectionEnded(uint endTime);
    event CandidateAdded(uint candidateId, string firstName, string lastName);

    // Modified constructor to accept VoterAuth address
    constructor(address _voterAuthAddress) public {
        require(_voterAuthAddress != address(0), "VoterAuth address cannot be zero");
        manager = msg.sender;
        voterAuth = VoterAuth(_voterAuthAddress);
        electionStarted = false;
        electionEnded = false;
    }

    // Admin-only modifier
    modifier restricted() {
        require(msg.sender == manager, "Only manager can perform this action");
        _;
    }
    
    // Check if election is active
    modifier electionActive() {
        require(electionStarted && !electionEnded, "Election is not active");
        _;
    }

    // Enhanced addCandidate function with event
    function addCandidate(string memory _CfirstName, string memory _ClastName, string memory _CidNumber) 
        public 
        restricted 
    {
        require(!electionStarted, "Cannot add candidates after election has started");
        candidatesCount++;
        candidates[candidatesCount] = Candidate(candidatesCount, _CfirstName, _ClastName, _CidNumber, 0);
        emit CandidateAdded(candidatesCount, _CfirstName, _ClastName);
    }

    // Improved vote function with eligibility check
    function vote(uint _candidateId) public electionActive {
        // Check if voter is eligible through VoterAuth
        require(voterAuth.isEligibleToVote(msg.sender), "Voter is not eligible to vote");
        
        // Check candidate validity
        require(_candidateId > 0 && _candidateId <= candidatesCount, "Invalid candidate");
        
        // Track that voter has voted locally
        voters[msg.sender] = true;
        
        // Mark voter as having voted in VoterAuth
        voterAuth.markVoted(msg.sender);
        
        // Increment candidate vote count
        candidates[_candidateId].voteCount++;
        
        // Emit vote event
        emit votedEvent(_candidateId);
    }
    
    // Start election function
    function startElection() public restricted {
        require(!electionStarted, "Election already started");
        electionStarted = true;
        startTime = now;
        emit ElectionStarted(startTime);
    }
    
    // End election function
    function endElection() public restricted {
        require(electionStarted && !electionEnded, "Cannot end election that hasn't started or is already ended");
        electionEnded = true;
        endTime = now;
        emit ElectionEnded(endTime);
    }
    
    // Get election status
    function getElectionStatus() public view returns (bool started, bool ended, uint start, uint end) {
        return (electionStarted, electionEnded, startTime, endTime);
    }

    struct User {
        string firstName;
        string lastName;
        string idNumber;
        string email;
        bytes32 passwordHash; // Changed from string to bytes32 for hashed password
        address add;
    }

    mapping (uint => User) public users;
    uint public usersCount;

    // Modified addUser function with password hashing
    function addUser(
        string memory _firstName, 
        string memory _lastName, 
        string memory _idNumber, 
        string memory _email, 
        bytes32 _passwordHash // Accept hashed password instead of plain text
    ) 
        public 
    {
        usersCount++;
        users[usersCount] = User(_firstName, _lastName, _idNumber, _email, _passwordHash, msg.sender);
    }
    
    // Function to get winner(s) after election ends
    function getWinner() public view returns (uint[] memory) {
        require(electionEnded, "Election has not ended yet");
        
        // Find the maximum vote count
        uint maxVotes = 0;
        for (uint i = 1; i <= candidatesCount; i++) {
            if (candidates[i].voteCount > maxVotes) {
                maxVotes = candidates[i].voteCount;
            }
        }
        
        // Count how many candidates have the maximum votes (in case of a tie)
        uint winnerCount = 0;
        for (uint i = 1; i <= candidatesCount; i++) {
            if (candidates[i].voteCount == maxVotes) {
                winnerCount++;
            }
        }
        
        // Create array of winners
        uint[] memory winners = new uint[](winnerCount);
        uint currentIndex = 0;
        
        for (uint i = 1; i <= candidatesCount; i++) {
            if (candidates[i].voteCount == maxVotes) {
                winners[currentIndex] = i;
                currentIndex++;
            }
        }
        
        return winners;
    }
}