document.addEventListener('DOMContentLoaded', function() {
    console.log("Marketplace site is loaded!");

    function searchBusinesses() {
        // Get the search input element
        let inputElement = document.getElementById('search');

        // If the search input isn't found, log an error and return
        if (!inputElement || !(inputElement instanceof HTMLInputElement)) {
            console.error("Search input not found or not an HTML input element!");
            return;
        }

        // Get the value entered in the search bar and convert it to lowercase for case-insensitive comparison
        let input = inputElement.value.toLowerCase();

        // Get all business listings (div elements with the class 'listing')
        let listings = document.querySelectorAll('.listing');

        // Loop through each listing and check if the title or description matches the search input
        listings.forEach(function(listing) {
            // Cast listing to HTMLDivElement to access the 'style' property
            let listingElement = listing;

            // Get the title and description from each listing using optional chaining
            let title = listing.querySelector('h3')?.innerText.toLowerCase() || '';
            let description = listing.querySelector('p')?.innerText.toLowerCase() || '';

            // Check if the search input is found in the title or description
            if (title.includes(input) || description.includes(input)) {
                // Show the listing if it matches the search
                listingElement.style.display = "";
            } else {
                // Hide the listing if it doesn't match
                listingElement.style.display = "none";
            }
        });
    }

    // Add an event listener to the search input to trigger search on keyup
    let searchInput = document.getElementById('search');
    if (searchInput) {
        searchInput.addEventListener('keyup', searchBusinesses);
    } else {
        console.error("Search input field not found!");
    }
});
// Node.js/Express example
app.get('my-marketplace-project/auth/google', async (req, res) => {
    const code = req.query.code; // This is the authorization code Google sends
    // Exchange the code for an access token
    const tokenResponse = await getAccessTokenFromGoogle(code);
    const userData = await getUserDataFromGoogle(tokenResponse.access_token);
    
    // Now, user is authenticated, and you can log them in or create a new account
});
