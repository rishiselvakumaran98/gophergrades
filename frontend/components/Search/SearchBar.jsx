import React, { useState } from "react";
import { Input, InputGroup, InputLeftElement, useColorModeValue } from "@chakra-ui/react";
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

  const textColor = "gray.800";
  const placeholderColor = "gray.500";
  const iconColor = "gray.600";
  const searchBarBg = useColorModeValue("rgba(255,255,255,0.7)", "rgba(255,255,255,0.3)");
  const searchBarFocusBg = useColorModeValue("white", "rgba(255,255,255,0.9)");

  return (
    <InputGroup>
      <InputLeftElement pointerEvents={"none"}>
        <Search2Icon color={"black"} />
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
        bg={searchBarBg} // Use dynamic background
        color={textColor} // --- FIX: Explicitly set the text color to a dark value ---
        _placeholder={{ color: placeholderColor }} // Style the placeholder text
        boxShadow={"md"} // Simplified shadow
        borderRadius="lg" // Use theme-based border radius
        border="1px solid transparent" // Start with a transparent border
        _hover={{
          bg: searchBarFocusBg,
          borderColor: "gray.300",
        }}
        _focus={{
          boxShadow: "outline", // Use theme's focus outline
          background: searchBarFocusBg,
          borderColor: "blue.400", // Example focus border color
        }}
      />
    </InputGroup>
  );
};
export default SearchBar;
