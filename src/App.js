import React from "react";
import "./App.css";
import Header from "./components/Header";

function App() {
  return (
    <div className="container">
      <Header />
      <header>
        <h1>Welcome to the CISE TA Application</h1>
      </header>
      <main>
        <p>
          We are excited to have you here! Click the button below to access the
          student form.
        </p>
        <a
          href="https://ufl.qualtrics.com/jfe/form/SV_5gMaPpNjF7lFKbs"
          className="cta-button"
        >
          Access the Form
        </a>
      </main>
      <footer>
        <p>© 2024 CISE Department, University of Florida</p>
      </footer>
    </div>
  );
}

export default App;
