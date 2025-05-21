document.addEventListener("DOMContentLoaded", function () {
    const signUpBtn = document.getElementById("signUpBtn");
    const logInBtn = document.getElementById("logInBtn");
    const currentPage = window.location.pathname.toLowerCase();

    if (signUpBtn) signUpBtn.classList.remove("active-btn");
    if (logInBtn) logInBtn.classList.remove("active-btn");

    if (currentPage.includes("register") && signUpBtn) {
        signUpBtn.classList.add("active-btn");
    } else if (currentPage.includes("login") && logInBtn) {
        logInBtn.classList.add("active-btn");
    }

    const registerBtn = document.getElementById("register-btn");

    if (registerBtn) {
        registerBtn.addEventListener("click", async (event) => {
            event.preventDefault();

            const name = document.getElementById("name").value.trim();
            const email = document.getElementById("email").value.trim().toLowerCase();
            const password = document.getElementById("password").value.trim();

            if (!name || !email || !password) {
                showCustomToast("warning", "Enter the complete details");
                return;
            }

            try {
                const response = await fetch("http://localhost:5000/api/auth/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username: name, email, password }),
                });

                const data = await response.json();

                if (response.ok) {
                    showCustomToast("success", "Registration Successful!");
                    setTimeout(() => {
                        window.location.href = "./login.html";
                    }, 1000);
                } else {
                    showCustomToast("warning", data.message || "Registration Failed!");
                }
            } catch (error) {
                console.error("Error:", error);
                showCustomToast("warning", "Something went wrong. Please try again later.");
            }
        });
    }
});

// Reusable toast function (make sure this is included once in your script)
function showCustomToast(type, message) {
    toastr.options = {
        toastClass: type === "success" ? "custom-success-toast" : "custom-warning-toast",
        iconClasses: {
            success: "custom-success-toast",
            warning: "custom-warning-toast"
        },
        positionClass: "toast-center-screen",
        timeOut: 3000,
        closeButton: true
    };
    toastr[type](message);
}
