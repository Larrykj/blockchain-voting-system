/**
 * Dark mode functionality for Blockchain Voting System
 * Provides consistent dark theme across all pages
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize dark mode based on saved preference
    initDarkMode();
    
    // Find existing dark mode toggle in navbar
    const navbarToggle = document.getElementById('darkModeToggle');
    
    // Only create a floating toggle if one doesn't exist in navbar
    if (!navbarToggle) {
        // Create dark mode toggle button
        const darkModeToggle = document.createElement('div');
        darkModeToggle.className = 'dark-mode-toggle';
        darkModeToggle.innerHTML = '<i class="fa fa-moon-o"></i>';
        darkModeToggle.id = 'darkModeFloatingToggle';
        document.body.appendChild(darkModeToggle);
        
        // Toggle dark mode when floating button is clicked
        darkModeToggle.addEventListener('click', function() {
            toggleDarkMode();
        });
    }
});

/**
 * Initialize dark mode based on saved preference
 */
function initDarkMode() {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme === 'enabled') {
        document.body.classList.add('dark-mode');
        updateDarkModeIcons(true);
    }
}

/**
 * Toggle dark mode state
 */
function toggleDarkMode() {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    
    // Save preference
    localStorage.setItem('darkMode', isDarkMode ? 'enabled' : 'disabled');
    
    // Update icons
    updateDarkModeIcons(isDarkMode);
    
    // Show toast notification
    const message = isDarkMode ? 'Dark mode enabled' : 'Light mode enabled';
    showThemeToast(message);
}

/**
 * Update all dark mode toggle icons
 * @param {boolean} isDarkMode - Whether dark mode is active
 */
function updateDarkModeIcons(isDarkMode) {
    // Update navbar toggle if it exists
    const navbarToggle = document.getElementById('darkModeToggle');
    if (navbarToggle) {
        const icon = navbarToggle.querySelector('i');
        if (icon) {
            icon.className = isDarkMode ? 'fa fa-sun-o' : 'fa fa-moon-o';
        }
    }
    
    // Update floating toggle if it exists
    const floatingToggle = document.getElementById('darkModeFloatingToggle');
    if (floatingToggle) {
        floatingToggle.innerHTML = isDarkMode ? 
            '<i class="fa fa-sun-o"></i>' : 
            '<i class="fa fa-moon-o"></i>';
    }
}

/**
 * Show a toast notification for theme changes
 * @param {string} message - Message to display
 */
function showThemeToast(message) {
    // Create toast if it doesn't exist
    if (document.getElementById('themeToast')) {
        document.getElementById('themeToast').remove();
    }
    
    const toast = document.createElement('div');
    toast.id = 'themeToast';
    toast.className = 'toast-message success';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Show and then hide after 3 seconds
    setTimeout(function() {
        toast.style.opacity = '1';
        setTimeout(function() {
            toast.style.opacity = '0';
            setTimeout(function() {
                toast.remove();
            }, 500);
        }, 3000);
    }, 100);
}
