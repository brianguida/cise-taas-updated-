import React from "react";
import "./Header.css";

function Header() {
  return (
    <div className="header-container">
      <div className="header-left">
        <div className="logo">UF</div>
        <span className="department-name">
          Computer & Information Science & Engineering
        </span>
      </div>
      <div className="header-right">
        <div className="icon search-icon">&#x1F50D;</div>{" "}
        {/* Unicode for search icon */}
        <div className="icon menu-icon">&#9776;</div>{" "}
        {/* Unicode for menu icon */}
      </div>
    </div>
  );
}

export default Header;
