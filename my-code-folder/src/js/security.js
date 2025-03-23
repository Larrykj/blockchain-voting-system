/**
 * Security Module for Blockchain Voting System
 * Implements advanced security features like MFA, E2E encryption, and fraud detection
 */

// Security Configuration
const SecurityConfig = {
    // Enable/disable security features
    enableMFA: true,
    enableE2EEncryption: true,
    enableFraudDetection: true,
    enableZKP: false, // Requires additional libraries
    
    // MFA settings
    mfaExpiryMinutes: 5,
    mfaCodeLength: 6,
    
    // Encryption settings
    encryptionAlgorithm: 'AES-GCM',
    encryptionKeySize: 256,
    
    // Audit log settings
    maxAuditEntries: 1000,
    storeAuditInLocalStorage: true
};

// Security Module
const Security = {
    /**
     * Initialize the security module
     */
    init: function() {
        // Initialize audit log
        if (!localStorage.getItem('auditLog')) {
            localStorage.setItem('auditLog', JSON.stringify([]));
        }
        
        // Show security badge if enabled
        this.showSecurityBadge();
        
        // Audit initialization
        this.addAuditEntry('Security module initialized');
        
        return this;
    },
    
    /**
     * Generate a cryptographically secure random token
     * @param {number} length - Length of the token
     * @returns {string} Random token
     */
    generateToken: function(length = 32) {
        const randomBytes = new Uint8Array(length);
        window.crypto.getRandomValues(randomBytes);
        return Array.from(randomBytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    },
    
    /**
     * Generate a numeric MFA code
     * @returns {string} 6-digit MFA code
     */
    generateMFACode: function() {
        const codeLength = SecurityConfig.mfaCodeLength;
        const randomDigits = new Uint32Array(codeLength);
        window.crypto.getRandomValues(randomDigits);
        
        let code = '';
        for (let i = 0; i < codeLength; i++) {
            code += (randomDigits[i] % 10).toString();
        }
        
        // Store MFA code in localStorage with expiration
        const expiry = new Date();
        expiry.setMinutes(expiry.getMinutes() + SecurityConfig.mfaExpiryMinutes);
        
        const mfaData = {
            code: code,
            expiry: expiry.getTime(),
            attempts: 0
        };
        
        localStorage.setItem('mfaData', JSON.stringify(mfaData));
        this.addAuditEntry('MFA code generated');
        
        return code;
    },
    
    /**
     * Verify MFA code entered by user
     * @param {string} enteredCode - Code entered by user
     * @returns {boolean} True if code is valid
     */
    verifyMFACode: function(enteredCode) {
        const mfaDataStr = localStorage.getItem('mfaData');
        if (!mfaDataStr) {
            this.addAuditEntry('MFA verification failed: No MFA data found', 'warning');
            return false;
        }
        
        const mfaData = JSON.parse(mfaDataStr);
        
        // Check if code has expired
        if (new Date().getTime() > mfaData.expiry) {
            this.addAuditEntry('MFA verification failed: Code expired', 'warning');
            localStorage.removeItem('mfaData');
            return false;
        }
        
        // Update attempt counter
        mfaData.attempts++;
        localStorage.setItem('mfaData', JSON.stringify(mfaData));
        
        // Check for too many attempts (max 3)
        if (mfaData.attempts > 3) {
            this.addAuditEntry('MFA verification failed: Too many attempts', 'warning');
            localStorage.removeItem('mfaData');
            return false;
        }
        
        // Verify code
        if (enteredCode === mfaData.code) {
            this.addAuditEntry('MFA verification successful');
            localStorage.removeItem('mfaData');
            return true;
        } else {
            this.addAuditEntry('MFA verification failed: Invalid code', 'warning');
            return false;
        }
    },
    
    /**
     * Send MFA code to user's email (simulation)
     * @param {string} email - User's email address
     * @param {string} code - MFA code to send
     * @returns {Promise} Resolves when code is sent
     */
    sendMFACodeByEmail: function(email, code) {
        return new Promise((resolve, reject) => {
            // Display the code for demo/development purposes
            console.log(`Sending MFA code ${code} to ${email}`);
            
            // Display code on screen as fallback
            const mfaAlert = document.createElement('div');
            mfaAlert.className = 'alert alert-info alert-dismissible fade show';
            mfaAlert.innerHTML = `
                <h4 class="alert-heading">MFA Code</h4>
                <p>Your MFA code is: <strong>${code}</strong></p>
                <p>Please use this code to verify your account.</p>
                <button type="button" class="close" data-dismiss="alert">&times;</button>
            `;
            
            document.body.appendChild(mfaAlert);
            setTimeout(() => {
                mfaAlert.classList.remove('show');
                setTimeout(() => mfaAlert.remove(), 500);
            }, 30000); // Leave it visible for 30 seconds
            
            this.addAuditEntry(`MFA code displayed for ${email}`);
            resolve();
        });
    },
    
    /**
     * Encrypt data using AES-GCM
     * @param {string} data - Data to encrypt
     * @param {string} password - Password to derive key from
     * @returns {Promise<string>} Encrypted data as base64 string
     */
    encryptData: async function(data, password) {
        try {
            // Convert password to key using PBKDF2
            const salt = window.crypto.getRandomValues(new Uint8Array(16));
            const keyMaterial = await window.crypto.subtle.importKey(
                'raw',
                new TextEncoder().encode(password),
                { name: 'PBKDF2' },
                false,
                ['deriveBits', 'deriveKey']
            );
            
            const key = await window.crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: salt,
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                keyMaterial,
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt']
            );
            
            // Encrypt the data
            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            const encryptedContent = await window.crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                key,
                new TextEncoder().encode(data)
            );
            
            // Combine the salt, iv, and encrypted content
            const result = new Uint8Array(salt.length + iv.length + encryptedContent.byteLength);
            result.set(salt, 0);
            result.set(iv, salt.length);
            result.set(new Uint8Array(encryptedContent), salt.length + iv.length);
            
            this.addAuditEntry('Data encrypted successfully');
            return btoa(String.fromCharCode.apply(null, result));
        } catch (error) {
            this.addAuditEntry('Encryption failed: ' + error.message, 'error');
            throw error;
        }
    },
    
    /**
     * Decrypt data using AES-GCM
     * @param {string} encryptedData - Base64 encoded encrypted data
     * @param {string} password - Password to derive key from
     * @returns {Promise<string>} Decrypted data
     */
    decryptData: async function(encryptedData, password) {
        try {
            // Decode the base64 data
            const encryptedBytes = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
            
            // Extract salt, iv, and encrypted content
            const salt = encryptedBytes.slice(0, 16);
            const iv = encryptedBytes.slice(16, 28);
            const encryptedContent = encryptedBytes.slice(28);
            
            // Derive the key from the password
            const keyMaterial = await window.crypto.subtle.importKey(
                'raw',
                new TextEncoder().encode(password),
                { name: 'PBKDF2' },
                false,
                ['deriveBits', 'deriveKey']
            );
            
            const key = await window.crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: salt,
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                keyMaterial,
                { name: 'AES-GCM', length: 256 },
                false,
                ['decrypt']
            );
            
            // Decrypt the data
            const decryptedContent = await window.crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                key,
                encryptedContent
            );
            
            this.addAuditEntry('Data decrypted successfully');
            return new TextDecoder().decode(decryptedContent);
        } catch (error) {
            this.addAuditEntry('Decryption failed: ' + error.message, 'error');
            throw error;
        }
    },
    
    /**
     * Generate SHA-256 hash of data
     * @param {string} data - Data to hash
     * @returns {Promise<string>} Hex string of hash
     */
    sha256: async function(data) {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    },
    
    /**
     * Create a simple Merkle Tree from an array of data
     * @param {Array} leaves - Array of data to include in the tree
     * @returns {Promise<Object>} Merkle tree structure
     */
    createMerkleTree: async function(leaves) {
        if (leaves.length === 0) return null;
        
        // First, hash all the leaves
        const hashedLeaves = await Promise.all(leaves.map(leaf => this.sha256(leaf)));
        
        const tree = {
            leaves: hashedLeaves,
            levels: [hashedLeaves]
        };
        
        // Build the tree levels
        let currentLevel = hashedLeaves;
        while (currentLevel.length > 1) {
            const nextLevel = [];
            
            for (let i = 0; i < currentLevel.length; i += 2) {
                if (i + 1 < currentLevel.length) {
                    // Hash the pair of nodes
                    const combined = currentLevel[i] + currentLevel[i + 1];
                    const hash = await this.sha256(combined);
                    nextLevel.push(hash);
                } else {
                    // Odd number of nodes, promote the last one
                    nextLevel.push(currentLevel[i]);
                }
            }
            
            tree.levels.push(nextLevel);
            currentLevel = nextLevel;
        }
        
        tree.root = tree.levels[tree.levels.length - 1][0];
        this.addAuditEntry('Merkle tree created with root: ' + tree.root.substring(0, 8) + '...');
        
        return tree;
    },
    
    /**
     * Add an entry to the audit log
     * @param {string} message - Message to log
     * @param {string} level - Log level (info, warning, error)
     */
    addAuditEntry: function(message, level = 'info') {
        const auditLogStr = localStorage.getItem('auditLog') || '[]';
        const auditLog = JSON.parse(auditLogStr);
        
        // Add new entry
        auditLog.push({
            timestamp: new Date().toISOString(),
            message: message,
            level: level,
            account: App?.account || 'unknown',
            userAgent: navigator.userAgent
        });
        
        // Trim if too large
        if (auditLog.length > SecurityConfig.maxAuditEntries) {
            auditLog.shift(); // Remove oldest entry
        }
        
        localStorage.setItem('auditLog', JSON.stringify(auditLog));
    },
    
    /**
     * Get audit log entries
     * @param {number} limit - Maximum number of entries to retrieve
     * @returns {Array} Audit log entries
     */
    getAuditLog: function(limit = 100) {
        const auditLogStr = localStorage.getItem('auditLog') || '[]';
        const auditLog = JSON.parse(auditLogStr);
        
        // Return the most recent entries
        return auditLog.slice(-limit).reverse();
    },
    
    /**
     * Display audit log in a UI element
     * @param {HTMLElement} container - Container element for audit log
     */
    displayAuditLog: function(container) {
        const auditEntries = this.getAuditLog();
        container.innerHTML = '';
        
        if (auditEntries.length === 0) {
            container.innerHTML = '<p class="text-muted">No audit entries found</p>';
            return;
        }
        
        auditEntries.forEach(entry => {
            const entryDiv = document.createElement('div');
            entryDiv.className = `audit-entry ${entry.level}`;
            
            // Format the timestamp
            const timestamp = new Date(entry.timestamp);
            const timeStr = timestamp.toLocaleString();
            
            entryDiv.innerHTML = `
                <span class="audit-timestamp">${timeStr}</span>
                ${entry.message}
            `;
            
            container.appendChild(entryDiv);
        });
    },
    
    /**
     * Show security badge on the page
     */
    showSecurityBadge: function() {
        // Check if badge already exists
        if (document.querySelector('.security-badge')) return;
        
        const badge = document.createElement('div');
        badge.className = 'security-badge';
        badge.innerHTML = '<i class="fa fa-shield-alt"></i> Secured by E2E Encryption';
        
        document.body.appendChild(badge);
        
        // Add animation
        setTimeout(() => {
            badge.style.animation = 'none';
            setTimeout(() => {
                badge.style.animation = '';
            }, 10);
        }, 3000);
    },
    
    /**
     * Basic fraud detection based on user behavior patterns
     * @param {Object} userData - User data and action history
     * @returns {Object} Risk assessment
     */
    detectFraud: function(userData) {
        let riskScore = 0;
        const flags = [];
        
        // Check for suspicious behavior patterns
        if (userData.loginAttempts > 3) {
            riskScore += 20;
            flags.push('Multiple login attempts');
        }
        
        if (userData.ipChanged) {
            riskScore += 15;
            flags.push('IP address changed');
        }
        
        if (userData.unusualTime) {
            riskScore += 10;
            flags.push('Unusual activity time');
        }
        
        if (userData.rapidActions) {
            riskScore += 25;
            flags.push('Rapid succession of actions');
        }
        
        // Log high-risk behavior
        if (riskScore > 30) {
            this.addAuditEntry(`Suspicious activity detected: ${flags.join(', ')}`, 'warning');
        }
        
        return {
            riskScore: riskScore,
            flags: flags,
            isHighRisk: riskScore > 50,
            isMediumRisk: riskScore > 30 && riskScore <= 50,
            isLowRisk: riskScore <= 30
        };
    }
};
