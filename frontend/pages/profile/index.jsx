// pages/profile/index.jsx
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Button,
  IconButton,
  RadioGroup,
  Radio,
  StackDivider,
  useColorModeValue, // For light/dark mode specific styles
  Tag,
  TagLabel,
  TagCloseButton,
  Wrap,
  WrapItem,
  Select as ChakraSelect, // Native Chakra Select for simple dropdowns
  Spinner,
  Flex
} from '@chakra-ui/react';
import { Select as ChakraReactSelect } from 'chakra-react-select'; // For searchable selects
import { useDropzone } from 'react-dropzone'; // For file uploads
import { FaPen, FaTrash, FaPlusCircle } from 'react-icons/fa';

const customSelectStyles = {
  control: (provided, state) => ({
    ...provided,
    minHeight: '48px',
    border: state.isFocused ? '1px solid #7a0019' : '1px solid #ccc',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(122, 0, 25, 0.2)' : 'none',
    '&:hover': {
      borderColor: state.isFocused ? '#7a0019' : '#888',
    }
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected ? '#7a0019' : state.isFocused ? '#f1f3f4' : '#ffffff',
    color: state.isSelected ? '#ffffff' : '#333',
  }),
};

// Grade options for the dropdown
const gradeOptions = [
  "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "F"
].map(g => ({ value: g, label: g }));

export default function ProfileSetup() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Form State - initially empty
  const [name, setName] = useState('');
  const [isNameEditing, setIsNameEditing] = useState(false);
  const [degreeType, setDegreeType] = useState('');
  const [selectedPrograms, setSelectedPrograms] = useState([]);
  const [interests, setInterests] = useState([]);
  const [currentInterest, setCurrentInterest] = useState('');
  const [careerGoal, setCareerGoal] = useState('');
  
  // State for the program dropdown and loading indicators
  const [availablePrograms, setAvailablePrograms] = useState([]);
  const [isPageLoading, setIsPageLoading] = useState(true); // For initial data fetch
  const [isSubmitting, setIsSubmitting] = useState(false); // For form submission

  const [semesters, setSemesters] = useState({}); 
  const [newSemesterName, setNewSemesterName] = useState(''); // For the "Add Semester" input
  const [courseOptions, setCourseOptions] = useState([]); // For the searchable course dropdown
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null); // To store the uploaded APAS/GPAS file


  // --- THIS IS THE KEY TO PERSISTING THE DATA ---
  // Fetch course list for the dropdown when the component mounts
  useEffect(() => {
    fetch('/api/courses/search')
      .then(res => res.json())
      .then(data => setCourseOptions(data));
  }, []);

  // This useEffect hook will run once the user's session is loaded.
  useEffect(() => {
    // Make sure we have a session before trying to fetch data
    if (status === 'authenticated') {
      setIsPageLoading(true);

      // Fetch the full program list for the dropdown
      fetch('/api/programs')
        .then(res => res.json())
        .then(data => setAvailablePrograms(data.programs));

      // Fetch the user's saved profile
      fetch('/api/user/profile')
        .then(res => {
          if (res.ok) return res.json();
          // If no profile exists yet, that's fine, we'll just use the empty state
          return null; 
        })
        .then(data => {
          if (data && data.profile) {
            const profile = data.profile;
            // --- Populate all form fields with data from the database ---
            setName(profile.name || session.user.name);
            setDegreeType(profile.degreeType || '');
            setInterests(profile.interests || []);
            setCareerGoal(profile.careerGoal || '');
            setSemesters(profile.semesters || {}); 
            // This part is important for react-select:
            // We need to convert the saved array of strings (e.g., ["Comp Sci"])
            // back into an array of objects (e.g., [{ value: "...", label: "Comp Sci" }])
            // that react-select can understand.
            if (profile.majors && availablePrograms.length > 0) {
              const savedPrograms = availablePrograms.filter(prog => 
                profile.majors.includes(prog.label)
              );
              setSelectedPrograms(savedPrograms);
            }
          } else {
            // If no profile, just pre-fill name from the session object
            setName(session.user.name);
          }
          setIsPageLoading(false);
        });
    } else if (status === 'unauthenticated') {
      router.push('/api/auth/signin');
    }
  }, [status, availablePrograms.length]); // Re-run if the programs list loads after the profile
  
  const handleAddSemester = () => {
    if (newSemesterName && !semesters[newSemesterName]) {
      setSemesters(prev => ({ ...prev, [newSemesterName]: [] }));
      setNewSemesterName('');
    }
  };

  const handleDeleteSemester = (semesterName) => {
    setSemesters(prev => {
      const newSemesters = { ...prev };
      delete newSemesters[semesterName];
      return newSemesters;
    });
  };
  
  const handleAddCourseToSemester = (semesterName) => {
    if (selectedCourse && selectedGrade) {
      const newCourse = {
        course: selectedCourse.value,
        grade: selectedGrade.value,
      };
      
      setSemesters(prev => {
        const currentCourses = prev[semesterName] || [];
        // Avoid adding duplicate courses within the same semester
        if (currentCourses.some(c => c.course === newCourse.course)) {
          return prev;
        }
        return {
          ...prev,
          [semesterName]: [...currentCourses, newCourse]
        };
      });

      // Reset shared input fields
      setSelectedCourse(null);
      setSelectedGrade(null);
    } else {
      alert("Please select a course and a grade.");
    }
  };

  const handleRemoveCourseFromSemester = (semesterName, courseNameToRemove) => {
    setSemesters(prev => ({
      ...prev,
      [semesterName]: prev[semesterName].filter(c => c.course !== courseNameToRemove)
    }));
  };
  
  // Handler for file uploads
  const onDrop = useCallback(acceptedFiles => {
    // We only accept one file
    if (acceptedFiles.length > 0) {
      setUploadedFile(acceptedFiles[0]);
    }
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
  });

  // ... (keep your handleInterestKeyDown and removeInterest functions the same)
  const handleInterestKeyDown = (e) => {
    if (e.key === 'Enter' && currentInterest) {
      e.preventDefault();
      if (!interests.includes(currentInterest)) {
        setInterests([...interests, currentInterest]);
      }
      setCurrentInterest('');
    }
  };

  const removeInterest = (interestToRemove) => {
    setInterests(interests.filter(i => i !== interestToRemove));
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    let finalInterests = [...interests];
    if (currentInterest && !finalInterests.includes(currentInterest)) {
      finalInterests.push(currentInterest);
    }

    const formData = new FormData();

    const profileData = {
      name,
      degreeType,
      majors: selectedPrograms.map(p => p.label),
      interests,
      careerGoal,
      semesters,
    };
    console.log("1. [FRONTEND] Sending this data to the API:", JSON.stringify(profileData, null, 2));
    
    formData.append('profileData', JSON.stringify(profileData));

    if (uploadedFile) {
      formData.append('apasReport', uploadedFile);
    }
    
    const response = await fetch('/api/user/profile', {
      method: 'PUT',
      body: formData,
    });

    setIsSubmitting(false);
    if (response.ok) {
      alert('Profile saved successfully!');
      // --- THIS IS THE CHANGE ---
      // Force a reload of the page to fetch the new data from the server.
      router.reload();
    } else {
      alert('Failed to save profile.');
    }
  };

  // Chakra UI color mode values for dynamic styling
  const formBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const inputFocusBorderColor = useColorModeValue('brand.maroon', 'brand.gold'); // Assuming you set these in theme

  // Display a loading screen while fetching initial data
  if (isPageLoading || status === 'loading') {
    return (
      <Flex justify="center" align="center" height="100vh">
        <Spinner size="xl" />
      </Flex>
    );
  }

  return (
    <Box 
      maxW="800px" 
      mx="auto" 
      p={{ base: 4, md: 8 }} 
      my={{ base: 4, md: 8}}
      bg={formBg} 
      borderWidth="1px" 
      borderColor={borderColor}
      borderRadius="lg" 
      boxShadow="lg"
    >
      <Heading as="h1" size="lg" mb={2}>Your Profile</Heading>
      <Text color={useColorModeValue('gray.600', 'gray.400')} mb={8}>
        Keep your information up to date to get the best recommendations.
      </Text>
      
      <VStack as="form" onSubmit={handleSubmit} spacing={6} align="stretch">
        {/* Name Field */}
        <FormControl id="name">
          <FormLabel>Name</FormLabel>
          <HStack>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              isDisabled={!isNameEditing}
              focusBorderColor={inputFocusBorderColor}
            />
            <IconButton 
              aria-label="Edit name" 
              icon={<FaPen />} 
              onClick={() => setIsNameEditing(!isNameEditing)}
            />
          </HStack>
        </FormControl>

        {/* Programs (Majors/Minors) */}
        <FormControl id="programs">
          <FormLabel>Your Programs (Majors & Minors)</FormLabel>
          <ChakraReactSelect
            isMulti
            options={availablePrograms}
            value={selectedPrograms}
            onChange={setSelectedPrograms}
            placeholder="Select your majors and minors..."
            chakraStyles={{ // Example of basic styling, chakra-react-select has its own theming capabilities
              control: (provided) => ({ ...provided, borderColor: borderColor }),
            }}
          />
        </FormControl>
        
        {/* Interests */}
        <FormControl id="interests">
          <FormLabel>Academic Interests</FormLabel>
          <Input
            value={currentInterest}
            onChange={(e) => setCurrentInterest(e.target.value)}
            onKeyDown={handleInterestKeyDown}
            placeholder="Type an interest and press Enter"
            focusBorderColor={inputFocusBorderColor}
          />
          <Wrap mt={2} spacing={2}>
            {interests.map(interest => (
              <WrapItem key={interest}>
                <Tag size="md" borderRadius="full" variant="solid" colorScheme="blue">
                  <TagLabel>{interest}</TagLabel>
                  <TagCloseButton onClick={() => removeInterest(interest)} />
                </Tag>
              </WrapItem>
            ))}
          </Wrap>
        </FormControl>

        {/* Career Goal */}
        <FormControl id="careerGoal">
          <FormLabel>Career Goal</FormLabel>
          <Textarea 
            value={careerGoal} 
            onChange={e => setCareerGoal(e.target.value)}
            placeholder="e.g., Software Engineer at Google..."
            focusBorderColor={inputFocusBorderColor}
          />
        </FormControl>

        <StackDivider borderColor={borderColor} />

        {/* Courses Taken By Semester */}
        <FormControl>
          <FormLabel as="h3" fontSize="lg" fontWeight="semibold">Courses Taken By Semester</FormLabel>
          <VStack spacing={6} align="stretch" mt={4}>
            {Object.keys(semesters).map(semesterName => (
              <Box key={semesterName} p={4} borderWidth="1px" borderRadius="md" borderColor={borderColor}>
                <Flex justify="space-between" align="center" mb={3}>
                  <Heading as="h4" size="md">{semesterName}</Heading>
                  <IconButton 
                    aria-label="Delete semester" 
                    icon={<FaTrash />} 
                    variant="ghost" 
                    colorScheme="red"
                    onClick={() => handleDeleteSemester(semesterName)} 
                  />
                </Flex>
                {/* List of courses */}
                <VStack spacing={2} align="stretch" mb={3}>
                  {semesters[semesterName].map((c, index) => (
                    <HStack key={index} p={2} bg={useColorModeValue('gray.50', 'gray.600')} borderRadius="md" justify="space-between">
                      <Text>{c.course} - <Text as="strong">{c.grade}</Text></Text>
                      <IconButton 
                        aria-label="Remove course" 
                        icon={<FaTrash />} 
                        size="sm" 
                        variant="ghost" 
                        colorScheme="red"
                        onClick={() => handleRemoveCourseFromSemester(semesterName, c.course)} 
                      />
                    </HStack>
                  ))}
                </VStack>
                {/* Add course form */}
                <HStack spacing={2}>
                  <Box flex={4}>
                    <ChakraReactSelect
                        placeholder="Search for a course..."
                        options={courseOptions}
                        value={selectedCourse} // Note: this state needs to be handled carefully if multiple add forms are open
                        onChange={setSelectedCourse} // or make this specific to this semester's input
                        chakraStyles={{ control: (provided) => ({ ...provided, borderColor: borderColor })}}
                    />
                  </Box>
                  <Box flex={1}>
                    <ChakraSelect // Using native ChakraSelect for simple grades
                        placeholder="Grade"
                        value={selectedGrade?.value} // Ensure you pass the value, not the object
                        onChange={(e) => setSelectedGrade(gradeOptions.find(g => g.value === e.target.value))}
                        borderColor={borderColor}
                        focusBorderColor={inputFocusBorderColor}
                    >
                        {gradeOptions.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                    </ChakraSelect>
                  </Box>
                  <IconButton 
                    aria-label="Add course to semester" 
                    icon={<FaPlusCircle />} 
                    colorScheme="blue"
                    onClick={() => handleAddCourseToSemester(semesterName)} 
                  />
                </HStack>
              </Box>
            ))}
          </VStack>
          {/* Add New Semester */}
          <HStack mt={6} pt={4} borderTopWidth="1px" borderColor={borderColor}>
            <Input
              placeholder="Add new semester (e.g., Fall 2024)"
              value={newSemesterName}
              onChange={e => setNewSemesterName(e.target.value)}
              focusBorderColor={inputFocusBorderColor}
            />
            <Button onClick={handleAddSemester} colorScheme="blue">Add Semester</Button>
          </HStack>
        </FormControl>
        
        <StackDivider borderColor={borderColor} />

        {/* File Upload */}
        <FormControl>
          <FormLabel as="h3" fontSize="lg" fontWeight="semibold">Upload APAS/GPAS Report</FormLabel>
          <Box 
            {...getRootProps()} 
            p={6} 
            mt={2}
            border="2px dashed" 
            borderColor={isDragActive ? inputFocusBorderColor : borderColor} 
            borderRadius="md" 
            textAlign="center" 
            cursor="pointer"
            _hover={{ borderColor: inputFocusBorderColor }}
          >
            <input {...getInputProps()} />
            {
              uploadedFile ? <Text>{uploadedFile.name}</Text> :
              isDragActive ? <Text>Drop the file here ...</Text> :
              <Text>Drag 'n' drop your PDF report here, or click to select a file</Text>
            }
          </Box>
        </FormControl>

        <Button 
          type="submit" 
          colorScheme="blue" // Or your brand color like 'brand.maroon'
          isLoading={isSubmitting} 
          loadingText="Saving..."
          alignSelf="flex-start"
        >
          Save Profile
        </Button>
      </VStack>
    </Box>
  );
}