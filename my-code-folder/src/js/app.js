App = {
    web3Provider: null,
    contracts: {},
    account: '0x0',
    hasVoted: false,
    votedForID: 0,
    finishElection: 0,
    mins: 0,
    loading: false,
    userAuthenticated: false,

    // web3 connects our client side application to the blockchain.
    // metamask gives us an instance of web3 that we will use to connect to the blockchain
    // if this doesn't happen we will set a default web3 provider from our local blockchain instance 'localhost 7545'
    init: function () {
        // Load initial data
        return App.initWeb3()
          .then(function() {
            return App.initContract();
          })
          .catch(function(error) {
            console.error("Initialization error:", error);
            // Make sure UI is displayed even if there are errors
            $("#loader").hide();
            $("#content").show();
            
            // Show friendly error message to user
            if ($("#errorMessage").length === 0) {
              $("body").append(
                '<div id="errorMessage" class="alert alert-danger alert-dismissible" style="position: fixed; top: 10px; right: 10px; z-index: 9999;">' +
                '<button type="button" class="close" data-dismiss="alert">&times;</button>' +
                '<strong>Error:</strong> There was a problem connecting to the blockchain. ' +
                'Please ensure your wallet is connected and Ganache is running.' +
                '</div>'
              );
              
              // Auto-dismiss after 8 seconds
              setTimeout(function() {
                $("#errorMessage").fadeOut();
              }, 8000);
            }
          });
    },

    initWeb3: async function () {
        try {
            // Modern dapp browsers...
            if (window.ethereum) {
                App.web3Provider = window.ethereum;
                // Create web3 instance immediately to avoid undefined errors
                window.web3 = new Web3(window.ethereum);
                
                try {
                    // Try both account access methods
                    let accounts;
                    try {
                        // New method
                        accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                    } catch (reqError) {
                        console.log("eth_requestAccounts failed, trying enable():", reqError);
                        // Fallback to older method
                        accounts = await window.ethereum.enable();
                    }
                    
                    if (accounts && accounts.length > 0) {
                        App.account = accounts[0];
                        console.log("Connected with account:", App.account);
                    } else {
                        throw new Error("No accounts found");
                    }
                    
                    // Listen for account changes
                    window.ethereum.on('accountsChanged', function (accounts) {
                        if (accounts && accounts.length > 0) {
                            App.account = accounts[0];
                            console.log("Account changed to:", App.account);
                            App.render();
                        }
                    });
                    
                    // Listen for chain changes
                    window.ethereum.on('chainChanged', function () {
                        window.location.reload();
                    });
                } catch (error) {
                    console.error("User denied account access", error);
                    App.showError("You need to allow MetaMask access to use this application.");
                    throw error;
                }
            }
            // Legacy dapp browsers...
            else if (window.web3) {
                App.web3Provider = window.web3.currentProvider;
                window.web3 = new Web3(App.web3Provider);
                // Get accounts directly
                const accounts = await window.web3.eth.getAccounts();
                if (accounts && accounts.length > 0) {
                    App.account = accounts[0];
                    console.log("Legacy web3 connection with account:", App.account);
                }
            }
            // If no injected web3 instance is detected, fall back to Ganache
            else {
                App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
                window.web3 = new Web3(App.web3Provider);
                console.log("Using local web3 provider");
            }
            
            return App.account;
        } catch (error) {
            console.error("Web3 initialization error:", error);
            App.showError("Failed to initialize web3: " + error.message);
            throw error;
        }
    },

    // Initialize our contracts - returns a Promise
    initContract: function () {
        return new Promise(async (resolve, reject) => {
            try {
                // Check if web3 is initialized
                if (!window.web3) {
                    await App.initWeb3();
                }
                
                console.log("Initializing contracts...");
                
                // Load VoterAuth.json
                const voterAuthResponse = await fetch('./VoterAuth.json');
                if (!voterAuthResponse.ok) {
                    throw new Error(`Failed to load VoterAuth.json: ${voterAuthResponse.statusText}`);
                }
                const VoterAuthArtifact = await voterAuthResponse.json();
                
                // Load Election.json
                const electionResponse = await fetch('./Election.json');
                if (!electionResponse.ok) {
                    throw new Error(`Failed to load Election.json: ${electionResponse.statusText}`);
                }
                const ElectionArtifact = await electionResponse.json();
                
                // Get contracts
                App.contracts.VoterAuth = TruffleContract(VoterAuthArtifact);
                App.contracts.VoterAuth.setProvider(App.web3Provider);
                
                App.contracts.Election = TruffleContract(ElectionArtifact);
                App.contracts.Election.setProvider(App.web3Provider);
                
                // Get deployed contracts
                try {
                    App.voterAuthInstance = await App.contracts.VoterAuth.deployed();
                    console.log("VoterAuth contract deployed at:", App.voterAuthInstance.address);
                } catch (error) {
                    console.error("VoterAuth contract not deployed:", error);
                }
                
                try {
                    App.electionInstance = await App.contracts.Election.deployed();
                    console.log("Election contract deployed at:", App.electionInstance.address);
                } catch (error) {
                    console.error("Election contract not deployed:", error);
                }
                
                // Check if either contract is deployed
                if (!App.voterAuthInstance && !App.electionInstance) {
                    throw new Error("No contracts deployed. Please deploy the contracts first.");
                }
                
                resolve();
            } catch (error) {
                console.error("Contract initialization error:", error);
                App.showError("Contract initialization failed: " + error.message);
                reject(error);
            }
        });
    },

    // Listen for events emitted from the contract
    listenForEvents: function () {
        try {
            if (!App.contracts.Election) {
                console.error("Election contract not initialized");
                return;
            }
            
            App.contracts.Election.deployed().then(function (instance) {
                // Listen for vote events
                instance.votedEvent({}, {
                    fromBlock: 0,
                    toBlock: 'latest'
                }).watch(function (error, event) {
                    if (error) {
                        console.error("Vote event error:", error);
                    } else {
                        console.log("Vote event triggered", event);
                        App.showSuccess("New vote recorded!");
                        App.render();
                    }
                });

                // Listen for election started events
                instance.ElectionStarted({}, {
                    fromBlock: 0,
                    toBlock: 'latest'
                }).watch(function (error, event) {
                    if (error) {
                        console.error("Election started event error:", error);
                    } else {
                        console.log("Election started event triggered", event);
                        App.showSuccess("Election has started!");
                        App.render();
                    }
                });

                // Listen for election ended events
                instance.ElectionEnded({}, {
                    fromBlock: 0,
                    toBlock: 'latest'
                }).watch(function (error, event) {
                    if (error) {
                        console.error("Election ended event error:", error);
                    } else {
                        console.log("Election ended event triggered", event);
                        App.showSuccess("Election has ended!");
                        App.render();
                    }
                });
            }).catch(function(error) {
                console.error("Event listener error:", error);
            });
        } catch (error) {
            console.error("Event listener error:", error);
        }
    },

    // render function which is what will layout all the content on the page
    render: function () {
        try {
            App.showLoading("Loading application data...");
            var electionInstance;
            var voterAuthInstance;
            var loader = $("#loader");
            var content = $("#content");

            loader.show();
            content.hide();

            // Load account data
            if (App.account) {
                $("#accountAddress").html("Your Account: " + App.account);
            } else {
                console.error("No account available");
                App.showError("No connected account found");
            }

            // Verify contracts are initialized
            if (!App.contracts.VoterAuth || !App.contracts.Election) {
                console.error("Contracts not initialized properly");
                App.hideLoading();
                content.show();
                return;
            }

            // Load VoterAuth contract
            App.contracts.VoterAuth.deployed().then(function(instance) {
                voterAuthInstance = instance;
                return App.contracts.Election.deployed();
            }).then(function(instance) {
                electionInstance = instance;

                // Check if user is admin
                return electionInstance.manager();
            }).then(function (manager) {
                // Show/hide admin panel button
                const adminButton = document.querySelector('.buy-tickets');
                if (adminButton) {
                    if (manager !== App.account) {
                        adminButton.style.display = 'none';
                    } else {
                        adminButton.style.display = 'block';
                    }
                }

                // Check election status
                return electionInstance.getElectionStatus();
            }).then(function(status) {
                // Update UI based on election status
                const electionStarted = status[0];
                const electionEnded = status[1];

                // Update election status display if element exists
                const electionStatusEl = document.getElementById('election-status');
                if (electionStatusEl) {
                    if (electionEnded) {
                        electionStatusEl.innerText = "Election Status: Ended";
                        electionStatusEl.className = "alert alert-danger";
                    } else if (electionStarted) {
                        electionStatusEl.innerText = "Election Status: In Progress";
                        electionStatusEl.className = "alert alert-success";
                    } else {
                        electionStatusEl.innerText = "Election Status: Not Started";
                        electionStatusEl.className = "alert alert-info";
                    }
                    document.getElementById('election-status-container').style.display = 'block';
                }

                // Show/hide election status badge on admin page
                const statusBadge = document.getElementById('election-status-badge');
                if (statusBadge) {
                    if (electionEnded) {
                        statusBadge.innerText = "Election Status: Ended";
                        statusBadge.className = "badge badge-danger";
                    } else if (electionStarted) {
                        statusBadge.innerText = "Election Status: In Progress";
                        statusBadge.className = "badge badge-success";
                    } else {
                        statusBadge.innerText = "Election Status: Not Started";
                        statusBadge.className = "badge badge-warning";
                    }
                }

                if (electionEnded) {
                    localStorage.setItem("finishElection", "1");
                    // Election is over - show results, hide voting
                    $('form').hide();
                    $("#index-text").html("There is no active election ongoing at the moment");
                    $("#vote-text").html("No active voting ongoing");
                    
                    // Safely try to manipulate elements that might not exist on all pages
                    const addCandidateForm = document.querySelector('.addCandidateForm');
                    const votLink = document.querySelector('.vot');
                    
                    if (addCandidateForm) addCandidateForm.style.display = 'block';
                    if (votLink) votLink.style.display = 'none';
                } else if (electionStarted) {
                    localStorage.setItem("finishElection", "0");
                    // Election is active - show voting options
                    const votLink = document.querySelector('.vot');
                    const addCandidateForm = document.querySelector('.addCandidateForm');
                    
                    if (votLink) votLink.style.display = 'block';
                    if (addCandidateForm) addCandidateForm.style.display = 'none';
                } else {
                    // Election hasn't started
                    localStorage.setItem("finishElection", "1");
                    $("#index-text").html("Election has not started yet");
                    
                    const votLink = document.querySelector('.vot');
                    if (votLink) votLink.style.display = 'none';
                }

                // Get candidates
                return electionInstance.candidatesCount();
            }).then(function(candidatesCount) {
                var candidatesResults = $("#candidatesResults");
                if (candidatesResults.length > 0) {
                    candidatesResults.empty();
                }

                var candidatesSelect = $('#candidatesSelect');
                if (candidatesSelect.length > 0) {
                    candidatesSelect.empty();
                }

                // Store candidates in App for future use (e.g., charts)
                App.candidates = [];

                // Populate candidates
                for (var i = 1; i <= candidatesCount; i++) {
                    electionInstance.candidates(i).then(function(candidate) {
                        var id = candidate[0];
                        var fname = candidate[1];
                        var lname = candidate[2];
                        var idNumber = candidate[3];
                        var voteCount = candidate[4];

                        // Store candidate for later use
                        App.candidates.push({
                            id: id,
                            firstName: fname,
                            lastName: lname,
                            idNumber: idNumber,
                            voteCount: voteCount
                        });

                        // Render candidate Result if the element exists
                        if (candidatesResults.length > 0) {
                            var candidateTemplate = "<tr><th>" + id + "</th><td>" + fname+ " " + lname + "</td><td>" + idNumber + "</td><td>" + voteCount + "</td>";
                            
                            // Add action column for admin page
                            if (document.getElementById('candidates') && document.getElementById('candidates').classList.contains('show')) {
                                candidateTemplate += "<td><button class='btn btn-sm btn-outline-info'>View Details</button></td>";
                            }
                            
                            candidateTemplate += "</tr>";
                            candidatesResults.append(candidateTemplate);
                        }

                        // Render candidate ballot option if the element exists
                        if (candidatesSelect.length > 0) {
                            var candidateOption = "<option value='" + id + "' >" + fname + " " + lname + "</ option>";
                            candidatesSelect.append(candidateOption);
                        }
                        
                        // Update results table on results page if it exists
                        var resultsTable = $("#resultsTable");
                        if (resultsTable.length > 0 && App.candidates.length === parseInt(candidatesCount)) {
                            // All candidates loaded, update the results table
                            resultsTable.empty();
                            
                            // Calculate total votes
                            const totalVotes = App.candidates.reduce((sum, candidate) => sum + parseInt(candidate.voteCount), 0);
                            
                            // Sort candidates by votes (descending)
                            const sortedCandidates = [...App.candidates].sort((a, b) => parseInt(b.voteCount) - parseInt(a.voteCount));
                            
                            // Populate the table
                            sortedCandidates.forEach((candidate) => {
                                const percentage = totalVotes > 0 ? ((parseInt(candidate.voteCount) / totalVotes) * 100).toFixed(1) + '%' : '0%';
                                
                                const row = document.createElement('tr');
                                row.innerHTML = `
                                    <td>${candidate.id}</td>
                                    <td>${candidate.firstName} ${candidate.lastName}</td>
                                    <td>${candidate.voteCount}</td>
                                    <td>${percentage}</td>
                                `;
                                resultsTable.append(row);
                            });
                            
                            // Dispatch event for results chart
                            const resultsLoadedEvent = new CustomEvent('resultsLoaded', {
                                detail: { candidates: App.candidates }
                            });
                            window.dispatchEvent(resultsLoadedEvent);
                        }
                    });
                }

                // Check if voter is registered and hasn't voted
                return voterAuthInstance.isEligibleToVote(App.account);
            }).then(function(isEligible) {
                // If not eligible, either not registered or already voted
                if (!isEligible) {
                    return voterAuthInstance.voters(App.account);
                }
                loader.hide();
                content.show();
                App.hideLoading();
                return null;
            }).then(function(voter) {
                // If we got voter details, check if registered but already voted
                if (voter) {
                    const hasVoted = voter[3]; // Using VoterAuth struct index for hasVoted

                    if (hasVoted) {
                        $('form').hide();
                        $("#index-text").html("You are successfully logged in!");
                        $("#new-candidate").html("New candidates can't be added. The election process has already started.");
                        $("#vote-text").html("Vote casted successfully for candidate " + localStorage.getItem("votedForID"));
                    }
                }

                // Get users for admin panel
                return electionInstance.usersCount();
            }).then(function (usersCount) {
                // Only try to render users list if the element exists (admin page)
                var voterz = $("#voterz");
                if(voterz.length > 0) {
                    voterz.empty();

                    for (var i = 1; i <= usersCount; i++) {
                        electionInstance.users(i).then(function (user) {
                            var firstName = user[0];
                            var lastName = user[1];
                            var idNumber = user[2];
                            var email = user[3];
                            var address = user[5];

                            let voterTemplate = "<tr><td>" + firstName + " " + lastName + "</td><td>" + idNumber + "</td><td>" + email + "</td><td>" + address + "</td><td><span class='badge badge-success'>Registered</span></td></tr>";
                            voterz.append(voterTemplate);
                        });
                    }
                }

                // Update voting statistics if elements exist
                const totalVotersElement = document.getElementById('totalVoters');
                const votesCastElement = document.getElementById('votesCast');
                const voterTurnoutElement = document.getElementById('voterTurnout');
                
                if (totalVotersElement && App.getTotalVoters) {
                    App.getTotalVoters().then(totalVoters => {
                        totalVotersElement.textContent = totalVoters;
                        
                        // If we have candidates, calculate votes cast and turnout
                        if (App.candidates && App.candidates.length > 0) {
                            const totalVotes = App.candidates.reduce((sum, candidate) => sum + parseInt(candidate.voteCount), 0);
                            
                            if (votesCastElement) {
                                votesCastElement.textContent = totalVotes;
                            }
                            
                            if (voterTurnoutElement && totalVoters > 0) {
                                const turnout = ((totalVotes / totalVoters) * 100).toFixed(1) + '%';
                                voterTurnoutElement.textContent = turnout;
                            }
                        }
                    }).catch(console.error);
                }

                loader.hide();
                content.show();
                App.hideLoading();
            }).catch(function(error) {
                console.error("Render error:", error);
                App.showError("Failed to load application data: " + error.message);
                loader.hide();
                App.hideLoading();
            });
        } catch (error) {
            console.error("Render error:", error);
            App.hideLoading();
            $("#content").show();
        }
    },

    castVote: function () {
        App.showLoading("Casting your vote...");
        var candidateId = $('#candidatesSelect').val();
        App.votedForID = candidateId;
        localStorage.setItem("votedForID", candidateId);

        App.contracts.Election.deployed().then(function (instance) {
            return instance.vote(candidateId, { from: App.account });
        }).then(function (result) {
            // Wait for votes to update
            $("#content").hide();
            $("#loader").show();
            App.showSuccess("Your vote has been cast!");
            App.hideLoading();
            window.location.href = 'results.html';
        }).catch(function (err) {
            console.error("Vote error:", err);
            App.showError("Failed to cast vote: " + err.message);
            App.hideLoading();
        });
    },

    addUser: function () {
        App.showLoading("Creating your account...");
        var firstName = $('#firstName').val();
        var lastName = $('#lastName').val();
        var idNumber = $('#idNumber').val();
        var email = $('#email').val();
        var password = $('#password').val();

        // Use CryptoJS for more secure password hashing
        var passwordHash = CryptoJS.SHA256(password).toString();

        App.contracts.Election.deployed().then(function (instance) {
            return instance.addUser(firstName, lastName, idNumber, email, passwordHash, { from: App.account });
        }).then(function (result) {
            // Save registration data for admin approval
            var registrationData = {
                address: App.account,
                idHash: CryptoJS.SHA256(idNumber).toString(),
                digitalSignature: CryptoJS.SHA256(CryptoJS.SHA256(idNumber).toString() + App.account).toString(),
                email: email,
                name: firstName + " " + lastName
            };
            
            // Store pending registration in localStorage for admin approval
            var pendingRegistrations = JSON.parse(localStorage.getItem("pendingRegistrations") || "[]");
            pendingRegistrations.push(registrationData);
            localStorage.setItem("pendingRegistrations", JSON.stringify(pendingRegistrations));
            
            // Log registration in audit system
            Security.addAuditEntry(`New user registered: ${firstName} ${lastName} (${email})`);
            
            // Generate MFA verification code for completing registration
            const mfaCode = Security.generateMFACode();
            Security.sendMFACodeByEmail(email, mfaCode);
            
            // Show MFA verification modal from index.html
            $('#mfaModal').modal('show');
            
            App.showSuccess("Account created! Please verify your identity.");
            App.hideLoading();
        }).catch(function (err) {
            console.error("User registration error:", err);
            Security.addAuditEntry(`Registration error: ${err.message}`);
            App.showError("Failed to create account: " + err.message);
            App.hideLoading();
        });
    },

    login: function () {
        App.showLoading("Authenticating...");
        var idNumber = $('#lidNumber').val();
        var password = $('#lpassword').val();
        
        // Use secure hashing with CryptoJS instead of web3.sha3
        var passwordHash = CryptoJS.SHA256(password).toString();
        
        // First, check if user exists in the system
        App.contracts.Election.deployed().then(function (instance) {
            return instance.usersCount();
        }).then(function (count) {
            var found = false;
            var userCount = count.toNumber();
            var promises = [];
            var userData = null;

            // Check each user
            for (var i = 1; i <= userCount; i++) {
                promises.push(
                    App.contracts.Election.deployed().then(function(electionInstance) {
                        return electionInstance.users(i);
                    }).then(function(user) {
                        // Use secure comparison - in real app, would hash ID number too
                        if (user[2] === idNumber && user[4] === passwordHash) {
                            found = true;
                            userData = {
                                firstName: user[0],
                                lastName: user[1],
                                idNumber: user[2],
                                email: user[3],
                                isAdmin: user[5]
                            };
                            return;
                        }
                    })
                );
            }

            return Promise.all(promises).then(function() {
                if (found && userData) {
                    // Log this authentication attempt
                    Security.addAuditEntry(`Successful authentication for ID: ${userData.idNumber}`);
                    
                    // Store authenticated user data
                    localStorage.setItem("currentUser", JSON.stringify(userData));
                    
                    // Store login data for MFA verification
                    sessionStorage.setItem('pendingLogin', JSON.stringify({
                        idNumber: userData.idNumber,
                        email: userData.email
                    }));
                    
                    // Generate MFA code
                    const mfaCode = Security.generateMFACode();
                    Security.sendMFACodeByEmail(userData.email, mfaCode);
                    
                    // Show MFA verification modal
                    $('#mfaLoginModal').modal('show');
                    
                    App.hideLoading();
                    return true;
                } else {
                    // Log failed authentication attempt
                    Security.addAuditEntry(`Failed authentication attempt for ID: ${idNumber}`);
                    
                    App.showError("Invalid credentials. Please try again.");
                    App.hideLoading();
                    return false;
                }
            });
        }).catch(function (err) {
            console.error("Login error:", err);
            // Log error for security analysis
            Security.addAuditEntry(`Login error: ${err.message}`);
            
            App.showError("Login failed: " + err.message);
            App.hideLoading();
        });
    },

    addCandidate: function () {
        App.showLoading("Adding candidate...");
        var firstName = $('#CfirstName').val();
        var lastName = $('#ClastName').val();
        var idNumber = $('#CidNumber').val();

        App.contracts.Election.deployed().then(function (instance) {
            return instance.addCandidate(firstName, lastName, idNumber, { from: App.account });
        }).then(function (result) {
            App.showSuccess("Candidate added successfully!");
            App.hideLoading();
            window.location.href = 'admin.html';
        }).catch(function (err) {
            console.error("Add candidate error:", err);
            App.showError("Failed to add candidate: " + err.message);
            App.hideLoading();
        });
    },

    startElection: function () {
        App.showLoading("Starting election...");
        App.contracts.Election.deployed().then(function (instance) {
            return instance.startElection({ from: App.account });
        }).then(function (result) {
            localStorage.setItem("finishElection", "0");
            App.showSuccess("Election has started!");
            App.hideLoading();
            window.location.reload();
        }).catch(function (err) {
            console.error("Start election error:", err);
            App.showError("Failed to start election: " + err.message);
            App.hideLoading();
        });
    },

    endElection: function () {
        App.showLoading("Ending election...");
        App.contracts.Election.deployed().then(function (instance) {
            return instance.endElection({ from: App.account });
        }).then(function (result) {
            localStorage.setItem("finishElection", "1");
            App.showSuccess("Election has ended!");
            App.hideLoading();
            window.location.reload();
        }).catch(function (err) {
            console.error("End election error:", err);
            App.showError("Failed to end election: " + err.message);
            App.hideLoading();
        });
    },

    // UI helper functions
    showLoading: function(message) {
        if (!$('#loadingOverlay').length) {
          $('body').append(
            '<div id="loadingOverlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); z-index: 9999; display: flex; justify-content: center; align-items: center;">' +
            '<div style="background-color: white; padding: 20px; border-radius: 5px; text-align: center;">' +
            '<div class="spinner-border text-primary" role="status"><span class="sr-only">Loading...</span></div>' +
            '<div id="loadingMessage" style="margin-top: 10px;">Please wait...</div>' +
            '</div>' +
            '</div>'
          );
        }
        
        if (message) {
          $('#loadingMessage').text(message);
        }
        
        $('#loadingOverlay').show();
    },
  
    // Hide the loading overlay
    hideLoading: function() {
        $('#loadingOverlay').hide();
    },

    showSuccess: function(message) {
        // Create toast if it doesn't exist
        if ($("#successToast").length === 0) {
          $("body").append('<div id="successToast" class="toast-message success">' + message + '</div>');
        } else {
          $("#successToast").text(message);
          $("#successToast").show();
        }

        // Hide after 3 seconds
        setTimeout(function() {
          $("#successToast").fadeOut(500);
        }, 3000);
    },

    showError: function(message) {
        // Hide loading first if it's showing
        App.hideLoading();
        
        const toast = document.createElement('div');
        toast.className = 'toast error-toast';
        toast.innerHTML = `
            <div class="toast-header">
                <strong class="mr-auto">Error</strong>
                <button type="button" class="ml-2 mb-1 close" onclick="this.parentElement.parentElement.remove()">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div class="toast-body">${message}</div>
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
          toast.classList.add('show');
          setTimeout(() => { toast.remove(); }, 5000);
        }, 100);
    },
    
    // Get the VoterAuth contract address
    getVoterAuthAddress: async function() {
        try {
            const instance = await App.contracts.VoterAuth.deployed();
            return instance.address;
        } catch (error) {
            console.error("Error getting VoterAuth address:", error);
            return "Error";
        }
    },

    // Get the Election contract address
    getElectionAddress: async function() {
        try {
            const instance = await App.contracts.Election.deployed();
            return instance.address;
        } catch (error) {
            console.error("Error getting Election address:", error);
            return "Error";
        }
    },

    // Get the total number of registered voters
    getTotalVoters: async function() {
        try {
            const voterAuthInstance = await App.contracts.VoterAuth.deployed();
            // Access totalVoters as a state variable (call() with no arguments)
            const totalVoters = await voterAuthInstance.totalVoters.call();
            return totalVoters.toNumber();
        } catch (error) {
            console.error("Error getting total voters:", error);
            return 0;
        }
    }
};

$(function () {
    $(window).load(function () {
        App.init();
    });
});

// Handle MFA verification for login
$(document).on('click', '#verifyLoginMfa', function() {
    const enteredCode = $('#mfaLoginCode').val();
    const pendingLogin = JSON.parse(sessionStorage.getItem('pendingLogin') || '{}');
    
    if (!enteredCode || enteredCode.length !== 6) {
        App.showError("Please enter a valid 6-digit verification code");
        return;
    }
    
    // Verify with security module
    if (Security.verifyMFACode(enteredCode)) {
        // Complete login process
        App.userAuthenticated = true;
        $('#mfaLoginModal').modal('hide');
        
        // Log successful verification
        Security.addAuditEntry(`User verified with MFA: ${pendingLogin.idNumber}`);
        
        // Redirect to appropriate page based on user role
        const userData = JSON.parse(localStorage.getItem("currentUser") || '{}');
        if (userData.isAdmin) {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'index.html';
        }
    } else {
        App.showError("Invalid verification code. Please try again.");
        Security.addAuditEntry(`Failed MFA attempt for user ID: ${pendingLogin.idNumber}`);
    }
});