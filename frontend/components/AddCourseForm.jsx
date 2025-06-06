// components/AddCourseForm.jsx
import React, { useState } from 'react';
import { Box, HStack, IconButton } from '@chakra-ui/react';
// --- THIS IS THE KEY CHANGE ---
// Import both AsyncSelect (for courses) and the standard Select (for grades)
import { 
  AsyncSelect as ChakraReactAsyncSelect, 
  Select as ChakraReactSelect 
} from 'chakra-react-select';
import { FaPlusCircle } from 'react-icons/fa';

const gradeOptions = ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "F", "S", "N", "W"].map(g => ({ value: g, label: g }));

export const AddCourseForm = ({ onAddCourse, chakraSelectStyles }) => {
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedGrade, setSelectedGrade] = useState(null);

  const loadCourseOptions = (inputValue, callback) => {
    if (!inputValue || inputValue.length < 2) {
      callback([]);
      return;
    }
    fetch(`/api/courses/search?q=${inputValue}`)
      .then(res => res.json())
      .then(data => callback(data))
      .catch(() => callback([]));
  };

  const handleAddClick = () => {
    if (selectedCourse && selectedGrade) {
      const labelParts = selectedCourse.label.split(': ');
      const courseCode = labelParts[0];
      const courseTitle = labelParts.length > 1 ? labelParts.slice(1).join(': ') : '';

      onAddCourse({
        course: courseCode,
        title: courseTitle,
        grade: selectedGrade.value,
      });
      setSelectedCourse(null);
      setSelectedGrade(null);
    } else {
      alert("Please select a course and a grade.");
    }
  };

  return (
    <HStack spacing={2}>
      <Box flex={2}>
        <ChakraReactAsyncSelect
          placeholder="Search & add course..."
          loadOptions={loadCourseOptions}
          value={selectedCourse}
          onChange={setSelectedCourse}
          cacheOptions
          chakraStyles={chakraSelectStyles}
        />
      </Box>
      <Box flex={1}>
        {/* --- USE THE STANDARD SELECT COMPONENT HERE --- */}
        <ChakraReactSelect
          placeholder="Grade"
          options={gradeOptions} // Provide the local array directly
          value={selectedGrade}
          onChange={setSelectedGrade}
          chakraStyles={chakraSelectStyles}
        />
      </Box>
      <IconButton
        aria-label="Add course to semester"
        icon={<FaPlusCircle />}
        colorScheme="blue"
        onClick={handleAddClick}
      />
    </HStack>
  );
};