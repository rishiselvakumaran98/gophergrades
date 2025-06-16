import React, { useState } from "react";
import { Input, InputGroup, InputLeftElement } from "@chakra-ui/react";
import { Search2Icon } from "@chakra-ui/icons";

const SearchBar = ({
  onChange,
  placeholder = "Search by Class, Instructor, or Department",
}) => {
  const [search, setSearch] = useState("");

  const handleChange = (e) => {
    setSearch(e.target.value);
    onChange?.(e.target.value);
  };

  return (
    <InputGroup>
      <InputLeftElement pointerEvents={"none"} display="flex" alignItems="center" height="100%">
        <Search2Icon color={"black"} fontSize="24px" style={{ paddingLeft: "6px", paddingRight: "2px" }} />
      </InputLeftElement>
      <Input
        type={"text"}
        value={search}
        onChange={handleChange}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onChange(e.currentTarget.value);
          }
        }}
        placeholder={placeholder}
        _placeholder={{ color: "#AEAEAE" }}
        background={"rgba(255,255,255,0.3)"}
        boxShadow={"0px 0px 20px rgba(85, 85, 85, 0.2)"}
        height="60px"
        style={{
          borderRadius: "12px",
          border: "none",
        }}
        _hover={{
          background: "rgba(255,255,255,0.7)",
          boxShadow: "0px 0px 20px rgba(88, 88, 88, 0.2)",
        }}
        _focus={{
          boxShadow: "0px 0px 20px rgba(111, 19, 29, 0.35)",
          background: "rgba(255,255,255,0.9)",
        }}
        fontSize="15pt"
      />
    </InputGroup>
  );
};
export default SearchBar;
