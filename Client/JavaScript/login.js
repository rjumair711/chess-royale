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

    const loginBtn = document.getElementById("login-btn");

    if (loginBtn) {
        loginBtn.addEventListener("click", async (event) => {
            event.preventDefault();

            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value.trim();

            if (!email || !password) {
                showCustomToast("warning", "Please enter complete details");
                return;
            }

            try {
                const response = await fetch("http://localhost:5000/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ email, password }),
                });

                const data = await response.json();

                if (response.ok) {
                    showCustomToast("success", "Login successful!");
                    setTimeout(() => {
                        window.location.href = "./Homepage.html";
                    }, 1000);
                } else {
                    showCustomToast("warning", data.message || "Login failed!");
                }
            } catch (error) {
                console.error("Error:", error);
                showCustomToast("warning", "Something went wrong. Please try again later.");
            }
        });
    }
});

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
