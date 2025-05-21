// Function to check login status
async function checkLoginStatus() {
    try {
        const response = await fetch("http://localhost:5000/api/auth/check", {
            method: "GET",
            credentials: "include", // ✅ Send session cookie with request
        });

        const data = await response.json();
        console.log("Login status:", data);

        const registerBtn = document.getElementById("register-btn");
        const loginBtn = document.getElementById("login-btn");
        const logoutBtn = document.getElementById("logout-btn"); // Add a logout button in HTML
        const logout = document.getElementById("logout"); // Add a logout button in Dropdown
        
        if (data.isLoggedIn) {
            if (registerBtn) registerBtn.style.display = "none";
            if (loginBtn) loginBtn.style.display = "none";
            if (logoutBtn) logoutBtn.style.display = "block"; // Show logout button
            if (logout) logoutBtn.style.display = "block"; // Show logout button
        } else {
            if (registerBtn) registerBtn.style.display = "block";
            if (loginBtn) loginBtn.style.display = "block";
            if (logoutBtn) logoutBtn.style.display = "none"; // Hide logout button
            if (logout) logoutBtn.style.display = "block"; // Show logout button

        }
    } catch (error) {
        console.error("Error checking login status:", error);
    }
}

// Ensure script runs after DOM is loaded
window.onload = checkLoginStatus;

document.addEventListener("DOMContentLoaded", function () {
    const logoutBtn = document.getElementById("logout-btn");
    const logout = document.getElementById("logout"); 

    if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        localStorage.clear();
        try {
            const response = await fetch("http://localhost:5000/api/auth/logout", {
                method: "POST",
                credentials: "include",
            });

            const data = await response.json();
            showCustomToast('success', data.message);
            setTimeout(() => {
                window.location.href = "./Login.html";
            }, 2000); // Delay so toast is visible
        } catch (error) {
            console.error("Logout failed:", error);
            showCustomToast('error', "Logout failed");
        }
    });
}

if (logout) {
    logout.addEventListener("click", async () => {
        localStorage.clear();
        try {
            const response = await fetch("http://localhost:5000/api/auth/logout", {
                method: "POST",
                credentials: "include",
            });

            const data = await response.json();
            showCustomToast('success', data.message);
            setTimeout(() => {
                window.location.href = "../HTML/Login.html";
            }, 2000);
        } catch (error) {
            console.error("Logout failed:", error);
            showCustomToast('error', "Logout failed");
        }
    });
}
});

document.getElementById("theme").addEventListener("click", function () {
    let dashboard = document.querySelector(".sidebar"); // Select dashboard
    if (dashboard.style.backgroundColor === "black") {
        dashboard.style.backgroundColor = "green";  // Light mode
        dashboard.style.color = "black";  // Adjust text color
    } else {
        dashboard.style.backgroundColor = "black";  // Dark mode
        dashboard.style.color = "green";  // Adjust text color
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const profileImg = document.getElementById("profile");

    profileImg.addEventListener("click", async function () {
        let detailsDiv = document.getElementById("details");

        // Create container if not present
        if (!detailsDiv) {
            detailsDiv = document.createElement("div");
            detailsDiv.id = "details";
            detailsDiv.style.padding = "10px";
            detailsDiv.style.position = "absolute";
            detailsDiv  .style.top = profileImg.offsetTop + profileImg.offsetHeight + "px";
            detailsDiv.style.right = "10px";
            detailsDiv.style.zIndex = "999";

            document.body.appendChild(detailsDiv);
        } else {
            // Toggle visibility
            detailsDiv.style.display = detailsDiv.style.display === "none" ? "block" : "none";
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/api/auth/get-profile', {
                method: "GET",
                credentials: "include"
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const userData = await response.json();

            detailsDiv.innerHTML = `
                <h2>Profile Info</h2>
                <p>Game ID: <input type="text" id="gameid-profile" value="${userData.gameId}" disabled /></p>
                <p>Username: <input type="text" id="username-profile" value="${userData.username}" disabled /></p>
                <p>Email: <input type="email" id="email-profile" value="${userData.email}" disabled /></p>
                <p>Location: <input type="text" id="location-profile" value="${userData.location || ''}" /></p>
                <p>Country:
                    <select id="country-profile">
                        <option value="">Select Country</option>
                        <option value="USA" ${userData.country === 'USA' ? 'selected' : ''}>USA</option>
                        <option value="UK" ${userData.country === 'UK' ? 'selected' : ''}>UK</option>
                        <option value="Canada" ${userData.country === 'Canada' ? 'selected' : ''}>Canada</option>
                        <option value="India" ${userData.country === 'India' ? 'selected' : ''}>India</option>
                    </select>
                </p>
                <p>Language:
                    <select id="language-profile">
                        <option value="">Select Language</option>
                        <option value="English" ${userData.language === 'English' ? 'selected' : ''}>English</option>
                        <option value="Spanish" ${userData.language === 'Spanish' ? 'selected' : ''}>Spanish</option>
                        <option value="French" ${userData.language === 'French' ? 'selected' : ''}>French</option>
                        <option value="German" ${userData.language === 'German' ? 'selected' : ''}>German</option>
                    </select>
                </p>
                <button id="save-btn">Save</button>
            `;

            // Save profile button functionality
            document.getElementById("save-btn").addEventListener("click", async function () {
                const location = document.getElementById("location-profile").value;
                const country = document.getElementById("country-profile").value;
                const language = document.getElementById("language-profile").value;

                try {
                    const updateResponse = await fetch('http://localhost:5000/api/auth/update-profile', {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        credentials: "include",
                        body: JSON.stringify({ location, country, language })
                    });

                    if (!updateResponse.ok) {
                        const errorText = await updateResponse.text();
                        throw new Error(errorText || "Unknown error occurred.");
                    }

                    showCustomToast("success", "Profile updated successfully!");
                } catch (error) {
                    showCustomToast("error", "Failed to update profile: " + error.message);
                }
            });

        } catch (error) {
            console.error(error);
            showCustomToast("error", "Failed to fetch profile: " + error.message);
        }
    });
});


// Toastr 
function showCustomToast(type, message) {
  toastr.options = {
    toastClass: type === "success" ? "custom-success-toast" : type === "error" ? "custom-error-toast" : "custom-warning-toast",
    iconClasses: {
      success: "custom-success-toast",
      warning: "custom-warning-toast",
      error: "custom-error-toast"
    },
    positionClass: "toast-center-screen",
    timeOut: 3000,
    closeButton: true,
  };
  toastr[type](message);
}

          