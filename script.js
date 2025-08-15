document.addEventListener('DOMContentLoaded', () => {
    // --- Element References ---
    const locationInput = document.getElementById('location-input');
    const searchButton = document.getElementById('search-button');
    const geolocationButton = document.getElementById('geolocation-button');
    const loader = document.getElementById('loader');
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    const dismissErrorButton = document.getElementById('dismiss-error-button');
    const weatherDisplay = document.getElementById('weather-display');

    // Weather display elements
    const cityNameElement = document.getElementById('city-name');
    const weatherDescriptionElement = document.getElementById('weather-description');
    const temperatureElement = document.getElementById('temperature');
    const feelsLikeElement = document.getElementById('feels-like');
    const humidityElement = document.getElementById('humidity');
    const windSpeedElement = document.getElementById('wind-speed');
    const weatherIconElement = document.getElementById('weather-icon');

    // --- State Management ---
    let isRequestInProgress = false; // Flag to prevent multiple concurrent API calls

    // --- API Configuration ---
    // Replace "YOUR_API_KEY_HERE" with your actual OpenWeatherMap API key
    const apiKey = "e9ee5766a9354a5378740036b37f6a87"; // User provided API key
    const apiBaseUrl = "https://api.openweathermap.org/data/2.5/weather";

    // --- Event Listeners ---
    searchButton.addEventListener('click', () => {
        const city = locationInput.value.trim();
        if (city) {
            fetchWeatherByCity(city);
        } else {
            showError("Please enter a city or ZIP code.", true); // Sticky error for input validation
        }
    });

    locationInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            searchButton.click(); // Trigger search on Enter key press
        }
    });

    geolocationButton.addEventListener('click', fetchWeatherByGeolocation);
    dismissErrorButton.addEventListener('click', hideError);

    // Fetch weather for a default city on page load for initial display
    fetchWeatherByCity("London");

    // --- Core Functions ---

    /**
     * Fetches weather data for a specific city name or ZIP code.
     * @param {string} query The name of the city or ZIP code.
     */
    function fetchWeatherByCity(query) {
        // Determine if the query is a ZIP code (simple check for numbers)
        const isZipCode = /^\d+$/.test(query);
        const url = isZipCode
            ? `${apiBaseUrl}?zip=${query}&appid=${apiKey}&units=metric`
            : `${apiBaseUrl}?q=${query}&appid=${apiKey}&units=metric`;
        fetchWeatherData(url);
    }

    /**
     * Gets the user's current geographical location and fetches weather data for it.
     */
    function fetchWeatherByGeolocation() {
        if (isRequestInProgress) return; // Prevent multiple requests
        if (navigator.geolocation) {
            setButtonsDisabled(true);
            showLoader();
            hideError(); // Clear any previous errors
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    const url = `${apiBaseUrl}?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`;
                    fetchWeatherData(url);
                },
                (error) => {
                    handleGeolocationError(error);
                    setButtonsDisabled(false); // Re-enable buttons on geolocation error
                    hideLoader(); // Hide loader on error
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 } // Geolocation options
            );
        } else {
            showError("Geolocation is not supported by your browser.", true);
        }
    }

    /**
     * The main asynchronous function to fetch data from the OpenWeatherMap API.
     * Handles loading states, errors, and displays weather data.
     * @param {string} url The complete API URL to fetch from.
     */
    async function fetchWeatherData(url) {
        if (isRequestInProgress) return;
        setButtonsDisabled(true);
        showLoader();
        hideError(); // Hide previous errors before new fetch

        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json();
                let customErrorMessage = errorData.message || "An unknown error occurred.";
                if (response.status === 401) {
                    customErrorMessage = "Invalid API Key. Please ensure your key is correct and active.";
                } else if (response.status === 404) {
                    customErrorMessage = "City or ZIP code not found. Please check the spelling or number.";
                }
                throw new Error(customErrorMessage);
            }
            const data = await response.json();
            displayWeather(data);
        } catch (error) {
            console.error("Fetch error:", error);
            // On any fetch error, show a sticky message that does NOT hide existing weather data.
            showError(error.message || "Failed to fetch weather data. Please try again.", true);
            hideWeatherDisplay(); // Hide weather display on error if it was shown
        } finally {
            hideLoader();
            setButtonsDisabled(false);
        }
    }

    // --- UI Update Functions ---

    /**
     * Updates the HTML to display the weather information.
     * @param {object} data The weather data object from the API.
     */
    function displayWeather(data) {
        // Basic validation for successful API response
        if (data.cod && data.cod !== 200) {
            showError(data.message || "Could not retrieve weather data.", true);
            hideWeatherDisplay();
            return;
        }

        // Populate weather details
        cityNameElement.textContent = `${data.name}, ${data.sys.country}`;
        weatherDescriptionElement.textContent = data.weather[0].description;
        temperatureElement.textContent = `${Math.round(data.main.temp)}°C`;
        feelsLikeElement.textContent = `${Math.round(data.main.feels_like)}°C`;
        humidityElement.textContent = `${data.main.humidity}%`;
        windSpeedElement.textContent = `${data.wind.speed} m/s`; // Wind speed in meters/second

        // Set weather icon
        const iconCode = data.weather[0].icon;
        const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;
        weatherIconElement.src = iconUrl;
        weatherIconElement.alt = data.weather[0].description;

        // Animate weather display into view
        weatherDisplay.classList.remove('hidden');
        setTimeout(() => {
            weatherDisplay.style.opacity = '1';
            weatherDisplay.style.transform = 'translateY(0)';
        }, 10); // Small delay for transition to apply
    }

    /**
     * Handles errors from the Geolocation API.
     * @param {object} error The error object from the Geolocation API.
     */
    function handleGeolocationError(error) {
        let message = "An unknown geolocation error occurred.";
        switch (error.code) {
            case error.PERMISSION_DENIED:
                message = "Location access denied. Please enable location services for this site.";
                break;
            case error.POSITION_UNAVAILABLE:
                message = "Location information is unavailable. Try again later.";
                break;
            case error.TIMEOUT:
                message = "The request to get your location timed out.";
                break;
        }
        showError(message, true);
        hideLoader(); // Ensure loader is hidden on geolocation error
    }

    // --- Helper Functions for UI State Management ---

    /**
     * Disables or enables the main interactive buttons to prevent concurrent requests.
     * @param {boolean} disabled True to disable buttons, false to enable.
     */
    function setButtonsDisabled(disabled) {
        isRequestInProgress = disabled;
        searchButton.disabled = disabled;
        geolocationButton.disabled = disabled;
        locationInput.disabled = disabled; // Also disable input during request
    }

    /**
     * Shows the loading spinner with a fade-in effect.
     */
    function showLoader() {
        loader.classList.remove('hidden');
        setTimeout(() => loader.style.opacity = '1', 10);
    }

    /**
     * Hides the loading spinner with a fade-out effect.
     */
    function hideLoader() {
        loader.style.opacity = '0';
        setTimeout(() => loader.classList.add('hidden'), 500); // Hide after transition
    }

    /**
     * Shows an error message with a fade-in effect.
     * @param {string} message The error message to display.
     * @param {boolean} isSticky If true, the error won't hide the main weather display.
     */
    function showError(message, isSticky = false) {
        errorText.textContent = message.charAt(0).toUpperCase() + message.slice(1);
        errorMessage.classList.remove('hidden');
        setTimeout(() => errorMessage.style.opacity = '1', 10);

        // If not sticky and weather display is visible, hide it
        if (!isSticky && !weatherDisplay.classList.contains('hidden')) {
            hideWeatherDisplay();
        }
    }

    /**
     * Hides the error message box with a fade-out effect.
     */
    function hideError() {
        errorMessage.style.opacity = '0';
        setTimeout(() => errorMessage.classList.add('hidden'), 500); // Hide after transition
    }

    /**
     * Hides the main weather display card with a fade-out effect and slight upward translation.
     */
    function hideWeatherDisplay() {
        weatherDisplay.style.opacity = '0';
        weatherDisplay.style.transform = 'translateY(5px)'; // Move slightly up as it fades
        setTimeout(() => weatherDisplay.classList.add('hidden'), 500); // Hide after transition
    }
});