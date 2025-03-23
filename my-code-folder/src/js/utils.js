// Toast notification utilities
function showToast(message, type = 'success') {
    // Remove any existing toasts
    const existingToasts = document.querySelectorAll('.toast-message');
    existingToasts.forEach(toast => {
        toast.remove();
    });
    
    // Create toast container
    const toast = document.createElement('div');
    toast.className = `toast-message ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Automatically hide after 5 seconds (unless it's a loading toast)
    if (type !== 'loading') {
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                toast.remove();
            }, 500);
        }, 5000);
    }
    
    // Return toast element so it can be removed programmatically
    return toast;
}

// Show success message
function showSuccess(message) {
    return showToast(message, 'success');
}

// Show error message
function showError(message) {
    return showToast(message, 'error');
}

// Show loading message
function showLoading(message = 'Loading...') {
    return showToast(message, 'loading');
}

// Hide loading message
function hideLoading(loadingToast) {
    if (loadingToast) {
        loadingToast.style.opacity = '0';
        setTimeout(() => {
            loadingToast.remove();
        }, 500);
    }
}

// Hash password using SHA-256
async function hashPassword(password) {
    // Use crypto-js for hashing
    if (typeof CryptoJS !== 'undefined') {
        return CryptoJS.SHA256(password).toString(CryptoJS.enc.Hex);
    } else {
        // Fallback if crypto-js is not available
        console.warn('CryptoJS not available, using simple hash');
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(16);
    }
}

// Double hash for ID numbers (for enhanced security)
async function doubleHashId(idNumber, salt = "blockchain_voting_salt") {
    if (typeof CryptoJS !== 'undefined') {
        // First hash with salt
        const firstHash = CryptoJS.SHA256(idNumber + salt).toString(CryptoJS.enc.Hex);
        // Second hash
        return CryptoJS.SHA256(firstHash).toString(CryptoJS.enc.Hex);
    } else {
        // Fallback
        console.warn('CryptoJS not available, using simple double hash');
        let hash = idNumber + salt;
        for (let i = 0; i < 2; i++) {
            let tempHash = 0;
            for (let j = 0; j < hash.length; j++) {
                const char = hash.charCodeAt(j);
                tempHash = ((tempHash << 5) - tempHash) + char;
                tempHash = tempHash & tempHash;
            }
            hash = tempHash.toString(16);
        }
        return hash;
    }
}

// Generate digital signature (combination of id and timestamp)
async function generateDigitalSignature(idHash) {
    if (typeof CryptoJS !== 'undefined') {
        const timestamp = new Date().getTime().toString();
        return CryptoJS.SHA256(idHash + timestamp).toString(CryptoJS.enc.Hex);
    } else {
        // Fallback
        console.warn('CryptoJS not available, using simple signature');
        const timestamp = new Date().getTime().toString();
        let signature = idHash + timestamp;
        let hash = 0;
        for (let i = 0; i < signature.length; i++) {
            const char = signature.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(16);
    }
}

// Format timestamp to readable date/time
function formatTimestamp(timestamp) {
    const date = new Date(timestamp * 1000); // Convert from seconds to milliseconds
    return date.toLocaleString();
}

// Convert string to bytes32 (for sending to Solidity)
function stringToBytes32(str) {
    // Pad the string to 32 bytes
    const paddedStr = str.padEnd(64, '0');
    return '0x' + paddedStr;
}

// Validate email format
function isValidEmail(email) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

// Validate ID number format
function isValidIdNumber(idNumber) {
    // Assuming ID is numeric and at least 6 digits
    const re = /^\d{6,}$/;
    return re.test(idNumber);
}

// Validate password strength
function isStrongPassword(password) {
    // At least 8 chars, containing numbers, uppercase, lowercase, and special chars
    const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return re.test(password);
}

// Show password strength indicator
function updatePasswordStrength(password, indicatorElement) {
    if (!indicatorElement) return;
    
    let strength = 0;
    // Length check
    if (password.length >= 8) strength++;
    // Contains lowercase
    if (/[a-z]/.test(password)) strength++;
    // Contains uppercase
    if (/[A-Z]/.test(password)) strength++;
    // Contains number
    if (/\d/.test(password)) strength++;
    // Contains special char
    if (/[@$!%*?&]/.test(password)) strength++;
    
    // Update indicator
    let strengthText = '';
    let color = '';
    
    switch(strength) {
        case 0:
        case 1:
            strengthText = 'Weak';
            color = '#dc3545'; // Red
            break;
        case 2:
        case 3:
            strengthText = 'Moderate';
            color = '#ffc107'; // Yellow
            break;
        case 4:
            strengthText = 'Strong';
            color = '#28a745'; // Green
            break;
        case 5:
            strengthText = 'Very Strong';
            color = '#28a745'; // Green
            break;
    }
    
    indicatorElement.textContent = strengthText;
    indicatorElement.style.color = color;
}
