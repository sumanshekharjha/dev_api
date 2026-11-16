import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_BASE_URL = "http://127.0.0.1:8000";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

const initialLoginData = {
  email: "",
  password: "",
};

const initialSignupData = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export default function Login() {
  const navigate = useNavigate();

  const [isSignup, setIsSignup] = useState(false);

  const [loginData, setLoginData] = useState(initialLoginData);
  const [loginErrors, setLoginErrors] = useState({});
  const [isLoginPasswordVisible, setIsLoginPasswordVisible] =
    useState(false);

  const [signupData, setSignupData] = useState(initialSignupData);
  const [signupErrors, setSignupErrors] = useState({});
  const [isSignupPasswordVisible, setIsSignupPasswordVisible] =
    useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);

  const [isLoading, setIsLoading] = useState(false);

  function switchToSignup() {
    setIsSignup(true);
    setLoginErrors({});
  }

  function switchToLogin() {
    setIsSignup(false);
    setSignupErrors({});
  }

  function handleLoginChange(event) {
    const { name, value } = event.target;

    setLoginData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleSignupChange(event) {
    const { name, value } = event.target;

    setSignupData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function validateLogin() {
    const nextErrors = {};

    if (!loginData.email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!EMAIL_PATTERN.test(loginData.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!loginData.password) {
      nextErrors.password = "Password is required.";
    }

    return nextErrors;
  }

  function validateSignup() {
    const nextErrors = {};

    if (!signupData.name.trim()) {
      nextErrors.name = "Name is required.";
    }

    if (!signupData.email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!EMAIL_PATTERN.test(signupData.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!signupData.password) {
      nextErrors.password = "Password is required.";
    } else if (signupData.password.length < MIN_PASSWORD_LENGTH) {
      nextErrors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }

    if (!signupData.confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your password.";
    } else if (signupData.confirmPassword !== signupData.password) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    return nextErrors;
  }

  // ---------------- LOGIN ----------------

  async function handleLoginSubmit(event) {
    event.preventDefault();

    const nextErrors = validateLogin();
    setLoginErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsLoading(true);

    try {
      const params = new URLSearchParams({
        email: loginData.email.trim(),
        password: loginData.password,
      });

      const response = await fetch(
        `${API_BASE_URL}/auth/login?${params.toString()}`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      // Backend currently returns 200 even for invalid credentials
      if (!data.access_token) {
        setLoginErrors({
          password: data.message || "Invalid email or password.",
        });

        return;
      }

      // Save JWT token
      localStorage.setItem("access_token", data.access_token);

      // Optional: save basic user email
      localStorage.setItem("user_email", loginData.email.trim());

      // Clear login form
      setLoginData(initialLoginData);
      setLoginErrors({});

      // Go to dashboard
      navigate("/dashboard");
    } catch (error) {
      console.error("Login error:", error);

      setLoginErrors({
        password: "Unable to connect to server.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // ---------------- SIGNUP ----------------

  async function handleSignupSubmit(event) {
  event.preventDefault();

  const nextErrors = validateSignup();
  setSignupErrors(nextErrors);

  if (Object.keys(nextErrors).length > 0) {
    return;
  }

  setIsLoading(true);

  try {
    const response = await fetch(
      `${API_BASE_URL}/auth/register`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: signupData.name.trim(),
          email: signupData.email.trim(),
          password: signupData.password,
        }),
      }
    );

    const data = await response.json();

    if (data.message === "Email already registered") {
      setSignupErrors({
        email: "Email already registered.",
      });
      return;
    }

    // Signup successful
    alert("Account created successfully!");

    setSignupData(initialSignupData);
    setSignupErrors({});

    // Switch back to Login
    setIsSignup(false);

  } catch (error) {
    console.error("Signup error:", error);

    setSignupErrors({
      email: "Unable to connect to server.",
    });
  } finally {
    setIsLoading(false);
  }
}
  return (
    <div className="flex min-h-screen flex-col bg-white lg:flex-row">

      {/* Local, self-contained fade for the login/signup switch */}
      <style>{`
        @keyframes authFormFadeIn {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }
      `}</style>

      {/* Left: logo + form */}
      <div className="flex w-full flex-col px-6 py-8 sm:px-10 sm:py-10 lg:w-1/2 lg:px-16 lg:py-12">

        <Link
          to="/"
          className="font-display text-4xl font-semibold tracking-tight"
        >
          <span className="text-signal">dev </span>
          <span className="text-ink">404</span>
        </Link>

        <div className="flex flex-1 items-center">
          <div
            key={isSignup ? "signup" : "login"}
            style={{
              animation: "authFormFadeIn 0.2s ease-out",
            }}
            className="mx-auto w-full max-w-sm py-12 lg:py-0"
          >

            {/* ================= SIGNUP ================= */}

            {isSignup ? (
              <>
                <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
                  Create your account
                </h1>

                <p className="mt-2 text-sm text-ink/60">
                  Start working with APIs in dev 404.
                </p>

                <form
                  noValidate
                  onSubmit={handleSignupSubmit}
                  className="mt-8 flex flex-col gap-5"
                >

                  {/* Name */}
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-ink"
                    >
                      Name
                    </label>

                    <input
                      id="name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      value={signupData.name}
                      onChange={handleSignupChange}
                      placeholder="Enter your name"
                      aria-invalid={Boolean(signupErrors.name)}
                      aria-describedby={
                        signupErrors.name
                          ? "signup-name-error"
                          : undefined
                      }
                      className="mt-1.5 w-full border border-ink/20 bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/40 focus:border-ink focus:outline-none"
                    />

                    {signupErrors.name ? (
                      <p
                        id="signup-name-error"
                        className="mt-1.5 text-xs text-red-600"
                      >
                        {signupErrors.name}
                      </p>
                    ) : null}
                  </div>

                  {/* Email */}
                  <div>
                    <label
                      htmlFor="signup-email"
                      className="block text-sm font-medium text-ink"
                    >
                      Email
                    </label>

                    <input
                      id="signup-email"
                      name="email"
                      type="text"
                      autoComplete="email"
                      value={signupData.email}
                      onChange={handleSignupChange}
                      placeholder="Enter your email"
                      aria-invalid={Boolean(signupErrors.email)}
                      aria-describedby={
                        signupErrors.email
                          ? "signup-email-error"
                          : undefined
                      }
                      className="mt-1.5 w-full border border-ink/20 bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/40 focus:border-ink focus:outline-none"
                    />

                    {signupErrors.email ? (
                      <p
                        id="signup-email-error"
                        className="mt-1.5 text-xs text-red-600"
                      >
                        {signupErrors.email}
                      </p>
                    ) : null}
                  </div>

                  {/* Password */}
                  <div>
                    <label
                      htmlFor="signup-password"
                      className="block text-sm font-medium text-ink"
                    >
                      Password
                    </label>

                    <div className="relative mt-1.5">
                      <input
                        id="signup-password"
                        name="password"
                        type={
                          isSignupPasswordVisible
                            ? "text"
                            : "password"
                        }
                        autoComplete="new-password"
                        value={signupData.password}
                        onChange={handleSignupChange}
                        placeholder="Create a password"
                        aria-invalid={Boolean(signupErrors.password)}
                        aria-describedby={
                          signupErrors.password
                            ? "signup-password-error"
                            : undefined
                        }
                        className="w-full border border-ink/20 bg-white px-3.5 py-2.5 pr-16 text-sm text-ink placeholder:text-ink/40 focus:border-ink focus:outline-none"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setIsSignupPasswordVisible(
                            (visible) => !visible
                          )
                        }
                        className="absolute inset-y-0 right-0 px-3.5 text-xs font-medium text-ink/60 hover:text-ink"
                      >
                        {isSignupPasswordVisible
                          ? "Hide"
                          : "Show"}
                      </button>
                    </div>

                    {signupErrors.password ? (
                      <p
                        id="signup-password-error"
                        className="mt-1.5 text-xs text-red-600"
                      >
                        {signupErrors.password}
                      </p>
                    ) : null}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label
                      htmlFor="confirm-password"
                      className="block text-sm font-medium text-ink"
                    >
                      Confirm password
                    </label>

                    <div className="relative mt-1.5">
                      <input
                        id="confirm-password"
                        name="confirmPassword"
                        type={
                          isConfirmPasswordVisible
                            ? "text"
                            : "password"
                        }
                        autoComplete="new-password"
                        value={signupData.confirmPassword}
                        onChange={handleSignupChange}
                        placeholder="Confirm your password"
                        aria-invalid={Boolean(
                          signupErrors.confirmPassword
                        )}
                        aria-describedby={
                          signupErrors.confirmPassword
                            ? "confirm-password-error"
                            : undefined
                        }
                        className="w-full border border-ink/20 bg-white px-3.5 py-2.5 pr-16 text-sm text-ink placeholder:text-ink/40 focus:border-ink focus:outline-none"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setIsConfirmPasswordVisible(
                            (visible) => !visible
                          )
                        }
                        className="absolute inset-y-0 right-0 px-3.5 text-xs font-medium text-ink/60 hover:text-ink"
                      >
                        {isConfirmPasswordVisible
                          ? "Hide"
                          : "Show"}
                      </button>
                    </div>

                    {signupErrors.confirmPassword ? (
                      <p
                        id="confirm-password-error"
                        className="mt-1.5 text-xs text-red-600"
                      >
                        {signupErrors.confirmPassword}
                      </p>
                    ) : null}
                  </div>

                  {/* Signup Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="mt-2 bg-signal px-5 py-2.5 text-sm font-semibold text-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoading
                      ? "Creating account..."
                      : "Create account"}
                  </button>
                </form>

                <p className="mt-6 text-sm text-ink/60">
                  Already have an account?{" "}

                  <button
                    type="button"
                    onClick={switchToLogin}
                    className="font-medium text-ink hover:text-signal"
                  >
                    Sign in
                  </button>
                </p>
              </>
            ) : (

              /* ================= LOGIN ================= */

              <>
                <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
                  Welcome back
                </h1>

                <p className="mt-2 text-sm text-ink/60">
                  Sign in to continue to dev 404.
                </p>

                <form
                  noValidate
                  onSubmit={handleLoginSubmit}
                  className="mt-8 flex flex-col gap-5"
                >

                  {/* Email */}
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-ink"
                    >
                      Email
                    </label>

                    <input
                      id="email"
                      name="email"
                      type="text"
                      autoComplete="email"
                      value={loginData.email}
                      onChange={handleLoginChange}
                      placeholder="Enter your email"
                      aria-invalid={Boolean(loginErrors.email)}
                      aria-describedby={
                        loginErrors.email
                          ? "email-error"
                          : undefined
                      }
                      className="mt-1.5 w-full border border-ink/20 bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/40 focus:border-ink focus:outline-none"
                    />

                    {loginErrors.email ? (
                      <p
                        id="email-error"
                        className="mt-1.5 text-xs text-red-600"
                      >
                        {loginErrors.email}
                      </p>
                    ) : null}
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between">

                      <label
                        htmlFor="password"
                        className="block text-sm font-medium text-ink"
                      >
                        Password
                      </label>

                      <Link
                        to="/forgot-password"
                        className="text-xs font-medium text-ink/60 hover:text-ink"
                      >
                        Forgot password?
                      </Link>

                    </div>

                    <div className="relative mt-1.5">
                      <input
                        id="password"
                        name="password"
                        type={
                          isLoginPasswordVisible
                            ? "text"
                            : "password"
                        }
                        autoComplete="current-password"
                        value={loginData.password}
                        onChange={handleLoginChange}
                        placeholder="Enter your password"
                        aria-invalid={Boolean(loginErrors.password)}
                        aria-describedby={
                          loginErrors.password
                            ? "password-error"
                            : undefined
                        }
                        className="w-full border border-ink/20 bg-white px-3.5 py-2.5 pr-16 text-sm text-ink placeholder:text-ink/40 focus:border-ink focus:outline-none"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setIsLoginPasswordVisible(
                            (visible) => !visible
                          )
                        }
                        className="absolute inset-y-0 right-0 px-3.5 text-xs font-medium text-ink/60 hover:text-ink"
                      >
                        {isLoginPasswordVisible
                          ? "Hide"
                          : "Show"}
                      </button>
                    </div>

                    {loginErrors.password ? (
                      <p
                        id="password-error"
                        className="mt-1.5 text-xs text-red-600"
                      >
                        {loginErrors.password}
                      </p>
                    ) : null}
                  </div>

                  {/* Login Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="mt-2 bg-signal px-5 py-2.5 text-sm font-semibold text-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoading
                      ? "Signing in..."
                      : "Sign in"}
                  </button>
                </form>

                <p className="mt-6 text-sm text-ink/60">
                  Don&apos;t have an account?{" "}

                  <button
                    type="button"
                    onClick={switchToSignup}
                    className="font-medium text-ink hover:text-signal"
                  >
                    Sign up
                  </button>
                </p>
              </>
            )}

          </div>
        </div>
      </div>

      {/* Right: developer workspace image */}
      <div className="hidden bg-ink lg:block lg:w-1/2">
        <img
          src="/images/login.jpg"
          alt="A developer workspace with a monitor showing code, a keyboard, and books on a desk."
          className="h-full w-full object-cover"
        />
      </div>

    </div>
  );
}