// pages/profile/index.jsx
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import {
  Box,
  Heading,
  Text,
  VStack,
  Checkbox,
  CheckboxGroup,
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
  SimpleGrid,
  useColorModeValue, // For light/dark mode specific styles
  Tab,
  TabPanel,
  TabPanels,
  Tabs,
  TabList,
  Tag,
  TagLabel,
  TagCloseButton,
  Wrap,
  WrapItem,
  Select as ChakraSelect, // Native Chakra Select for simple dropdowns
  Spinner,
  Flex
} from '@chakra-ui/react';
import { AsyncSelect as ChakraReactAsyncSelect } from 'chakra-react-select';
import { AddCourseForm } from '../../components/AddCourseForm';
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

const getSemesterValue = (semesterName) => {
  const parts = semesterName.split(' ');
  if (parts.length !== 2) return 0; // Fallback for invalid format

  const season = parts[0];
  const year = parseInt(parts[1], 10);

  if (isNaN(year)) return 0; // Fallback

  let seasonValue = 0; // Default/Unknown season
  if (season === 'Fall') seasonValue = 1;
  else if (season === 'Summer') seasonValue = 2;
  else if (season === 'Spring') seasonValue = 3;

  // This creates a comparable number like 20253 for Fall 2025
  return (year * 10) + seasonValue;
};

export default function ProfileSetup() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // --- Academic Tab States ---
  const [currentCourses, setCurrentCourses] = useState(''); // Or an array if you build a list input
  const [learningStyles, setLearningStyles] = useState([]);
  const [academicGoals, setAcademicGoals] = useState([]);
  const [academicInterests, setAcademicInterests] = useState([]);
  const [currentAcademicGoal, setCurrentAcademicGoal] = useState('');
  const [areasOfDifficulty, setAreasOfDifficulty] = useState([]);
  const [currentAreaOfDifficulty, setCurrentAreaOfDifficulty] = useState('');
  
  // --- Interests & Goals Tab States ---
  // careerGoal, academicInterests (was 'interests') are existing
  const [extracurricularActivities, setExtracurricularActivities] = useState([]);
  const [currentExtracurricular, setCurrentExtracurricular] = useState('');
  const [researchInterests, setResearchInterests] = useState([]);
  const [currentResearchInterest, setCurrentResearchInterest] = useState('');
  const [skills, setSkills] = useState([]);
  const [currentSkill, setCurrentSkill] = useState('');

  // --- Preferences Tab States ---
  const [preferredStudyResources, setPreferredStudyResources] = useState([]); // For CheckboxGroup
  const [communicationPreferences, setCommunicationPreferences] = useState('');

  // --- University Specific Tab States ---
  const [campusInvolvement, setCampusInvolvement] = useState([]);
  const [currentCampusInvolvement, setCurrentCampusInvolvement] = useState('');
  const [useOfUniversityResources, setUseOfUniversityResources] = useState([]); // For CheckboxGroup


  // Form State - initially empty
  const [name, setName] = useState('');
  const [isNameEditing, setIsNameEditing] = useState(false);
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
  // const [courseOptions, setCourseOptions] = useState([]); // For the searchable course dropdown
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null); // To store the uploaded APAS/GPAS file
  const [transferCourses, setTransferCourses] = useState([]);

  const sortedSemesterKeys = Object.keys(semesters).sort((a, b) => getSemesterValue(b) - getSemesterValue(a));

  const semestersByYear = sortedSemesterKeys.reduce((acc, semesterName) => {
    const year = semesterName.split(' ')[1];
    if (!acc[year]) {
      acc[year] = [];
    }
    acc[year].push(semesterName);
    return acc;
  }, {});

  const sortedYears = Object.keys(semestersByYear).sort((a, b) => b - a);

  const loadCourseOptions = (inputValue, callback) => {
  // Don't search for very short strings
  if (!inputValue || inputValue.length < 2) {
    callback([]);
    return;
  }

  // Fetch from our API with the user's input as a query parameter
  fetch(`/api/courses/search?q=${inputValue}`)
    .then(res => res.json())
    .then(data => {
      callback(data); // `callback` is provided by AsyncSelect to update the options
    })
    .catch(error => {
      console.error("Error loading course options:", error);
      callback([]); // Return empty array on error
    });
};


  // --- THIS IS THE KEY TO PERSISTING THE DATA ---
  // Fetch course list for the dropdown when the component mounts
  // useEffect(() => {
  //   fetch('/api/courses/search')
  //     .then(res => res.json())
  //     .then(data => setCourseOptions(data || []));
  // }, []);

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
            setTransferCourses(profile.transferCourses || []);
            // Assuming selectedPrograms is for majors, and majors is an array of strings
            if (profile.majors && availablePrograms.length > 0) {
              const savedPrograms = availablePrograms.filter(prog => 
                profile.majors.includes(prog.label)
              );
              setSelectedPrograms(savedPrograms);
            } else {
              setSelectedPrograms([]);
            }
            setAcademicInterests(profile.academicInterests || []); // Use new name
            setCareerGoal(profile.careerGoal || '');
            setSemesters(profile.semesters || {});

            // Populate new fields
            setCurrentCourses(profile.currentCourses ? profile.currentCourses.join(', ') : ''); // Example if storing as array
            setLearningStyles(profile.learningStyles || []);
            setAcademicGoals(profile.academicGoals || []);
            setAreasOfDifficulty(profile.areasOfDifficulty || []);
            setExtracurricularActivities(profile.extracurricularActivities || []);
            setResearchInterests(profile.researchInterests || []);
            setSkills(profile.skills || []);
            setPreferredStudyResources(profile.preferredStudyResources || []);
            setCommunicationPreferences(profile.communicationPreferences || '');
            setCampusInvolvement(profile.campusInvolvement || []);
            setUseOfUniversityResources(profile.useOfUniversityResources || []);
            
          } else {
            setName(session?.user?.name || '');
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
  
  const handleAddCourseToSemester = (semesterName, newCourse) => {
    // newCourse is now an object like { course: '...', grade: '...' }
    setSemesters(prev => {
      const currentCoursesInSemester = prev[semesterName] || [];
      if (currentCoursesInSemester.some(c => c.course === newCourse.course)) {
        alert("This course has already been added to this semester.");
        return prev;
      }
      return {
        ...prev,
        [semesterName]: [...currentCoursesInSemester, newCourse]
      };
    });
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

    // Example: For fields that are simple strings from a textarea, but you want an array
    const currentCoursesArray = currentCourses.split(',').map(item => item.trim()).filter(Boolean);

    const profileData = {
      name,
      majors: selectedPrograms.map(p => p.label), // Assuming this is how majors are stored
      semesters,
      currentCourses: currentCoursesArray, // Send as array
      learningStyles,
      academicGoals,
      areasOfDifficulty,
      careerGoal,
      academicInterests, // Use new name
      extracurricularActivities,
      researchInterests,
      skills,
      preferredStudyResources,
      communicationPreferences,
      campusInvolvement,
      useOfUniversityResources,
      transferCourses,
    };
    console.log("1. [FRONTEND] Sending this data to the API:", JSON.stringify(profileData, null, 2));

    const formData = new FormData();
    
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
      const data = await response.json();
      alert('Profile saved successfully!');
      setSemesters(data.profile.semesters || {});
      setTransferCourses(data.profile.transferCourses || []);
      setUploadedFile(null); // Clear the uploaded file state
      // Force a reload of the page to fetch the new data from the server.
      router.reload();
    } else {
      alert('Failed to save profile.');
    }
  };

  // Chakra UI color mode values for dynamic styling
  const formBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const cardBg = useColorModeValue('gray.50', 'gray.800');
  const inputFocusBorderColor = useColorModeValue('brand.maroon', 'brand.gold'); // Assuming you set these in theme
  const focusBorderColor = useColorModeValue('brand.maroon', 'brand.gold');
  const subtleTextColor = useColorModeValue('gray.600', 'gray.400');

  const handleAddItemToList = (item, list, setList, setCurrentItem) => {
    if (item && !list.includes(item)) {
      setList([...list, item]);
    }
    setCurrentItem('');
  };

  const removeItemFromList = (itemToRemove, list, setList) => {
    setList(list.filter(i => i !== itemToRemove));
  };

  // Display a loading screen while fetching initial data
  if (isPageLoading || status === 'loading') {
    return (
      <Flex justify="center" align="center" height="100vh">
        <Spinner size="xl" />
      </Flex>
    );
  }

  const handleRemoveTransferCourse = (courseNameToRemove) => {
    setTransferCourses(prevCourses => 
      prevCourses.filter(course => course.course !== courseNameToRemove)
    );
  };

  return (
  <Box 
      maxW="1200px" 
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

        <Tabs variant="soft-rounded" colorScheme="blue" isLazy> {/* isLazy defers rendering of tab content */}
          <TabList overflowX="auto" overflowY="hidden">
            <Tab>Academic</Tab>
            <Tab>Interests & Goals</Tab>
            <Tab>Preferences</Tab>
            <Tab>University Specific</Tab>
          </TabList>

          <TabPanels mt={4}>
            {/* --- ACADEMIC TAB --- */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <FormControl>
                  <FormLabel>Your Programs (Majors & Minors)</FormLabel>
                  <ChakraReactAsyncSelect
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
                
                <FormControl>
                  <FormLabel as="h3" fontSize="lg" fontWeight="semibold">Courses Taken & Grades</FormLabel>
                  <Text fontSize="sm" color={subtleTextColor} mb={4}>
                    Upload your APAS report to automatically populate your course history, or add semesters manually below.
                  </Text>
                  <Box 
                    {...getRootProps()} 
                    p={6} mb={6}
                    border="2px dashed" 
                    borderColor={isDragActive ? focusBorderColor : borderColor} 
                    borderRadius="md" 
                    textAlign="center" 
                    cursor="pointer"
                    transition="border-color 0.2s, background-color 0.2s"
                    _hover={{ borderColor: focusBorderColor, bg: useColorModeValue('gray.50', 'gray.600') }}
                  >
                    <input {...getInputProps()} />
                    { uploadedFile ? <Text>{uploadedFile.name}</Text> : 
                      isDragActive ? <Text>Drop the PDF here ...</Text> : 
                      <Text><b>Upload APAS Report</b><br/>Drag 'n' drop or click to select</Text> }
                  </Box>
                  <VStack spacing={8} align="stretch" mt={6}>
                    {sortedYears.map(year => {
                      const yearSemesters = semestersByYear[year];
                      const hasSummer = yearSemesters.some(s => s.startsWith('Summer'));
                      const numColumns = hasSummer ? 3 : 2;

                      return (
                        <Box key={year} width="full">
                          <Heading as="h5" size="lg" mb={4} pl={1} borderBottomWidth="2px" borderColor={borderColor}>
                            {year} Academic Year
                          </Heading>
                          <SimpleGrid columns={{ base: 1, md: 2, lg: numColumns }} spacing={6}>
                            {yearSemesters.map(semesterName => (
                              <Box key={semesterName} bg={cardBg} borderWidth="1px" borderColor={borderColor} borderRadius="md" p={4}>
                                <Flex justify="space-between" align="center" mb={3}>
                                  <Heading as="h4" size="md">{semesterName}</Heading>
                                  <IconButton
                                    aria-label="Delete semester"
                                    icon={<FaTrash />}
                                    size="sm"
                                    variant="ghost"
                                    colorScheme="red"
                                    onClick={() => handleDeleteSemester(semesterName)}
                                  />
                                </Flex>
                                
                                <VStack spacing={2} align="stretch" mb={3}>
                                  {semesters[semesterName].map((c, index) => (
                                    <HStack key={`${semesterName}-${c.course}-${index}`} p={2} bg={useColorModeValue('gray.100', 'gray.700')} borderRadius="md" justify="space-between">
                                      <Text fontSize="sm">{c.course}{c.title ? ` - ${c.title}` : ''} - <strong>{c.grade}</strong></Text>
                                      <IconButton aria-label="Remove course" icon={<FaTrash />} size="xs" variant="ghost" colorScheme="red" onClick={() => handleRemoveCourseFromSemester(semesterName, c.course)} />
                                    </HStack>
                                  ))}
                                </VStack>

                                <AddCourseForm 
                                  onAddCourse={(newCourse) => handleAddCourseToSemester(semesterName, newCourse)}
                                  customSelectStyles={customSelectStyles} // Pass styles down
                                />
                              </Box>
                            ))}
                          </SimpleGrid>
                        </Box>
                      );
                    })}
                  </VStack>
                  <HStack mt={6} pt={4} borderTopWidth="1px" borderColor={borderColor}>
                    <Input
                      placeholder="Add new semester (e.g., Fall 2024)"
                      value={newSemesterName}
                      onChange={e => setNewSemesterName(e.target.value)}
                      focusBorderColor={focusBorderColor}
                    />
                    <Button onClick={handleAddSemester} colorScheme="blue">Add Semester</Button>
                  </HStack>
                </FormControl>


                <FormControl>
                  <FormLabel as="h3" fontSize="lg" fontWeight="semibold">
                    Transfer & Other Credits (AP, Dual Enrollment, etc.)
                  </FormLabel>
                  <Box 
                    mt={2}
                    p={4} 
                    bg={cardBg}
                    borderWidth="1px" 
                    borderColor={borderColor} 
                    borderRadius="md"
                  >
                    {transferCourses.length > 0 ? (
                      <Wrap spacing={2}>
                        {transferCourses.map((course, index) => (
                          <WrapItem key={index}>
                            <Tag size="lg" variant="solid" colorScheme="purple">
                              <TagLabel>{course.course} ({course.grade})</TagLabel>
                              <TagCloseButton onClick={() => handleRemoveTransferCourse(course.course)} />
                            </Tag>
                          </WrapItem>
                        ))}
                      </Wrap>
                    ) : (
                      <Text fontSize="sm" fontStyle="italic" color={subtleTextColor}>
                        No transfer credits detected. They will appear here after you upload an APAS report.
                      </Text>
                    )}
                  </Box>
                </FormControl>


                <FormControl>
                  <FormLabel>Current Courses (e.g., CSCI 1933, MATH 1272)</FormLabel>
                  <Textarea 
                    value={currentCourses} 
                    onChange={(e) => setCurrentCourses(e.target.value)}
                    placeholder="Enter courses, separated by commas"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Preferred Classroom Style</FormLabel>
                  <CheckboxGroup
                    colorScheme="blue"
                    value={learningStyles}
                    onChange={setLearningStyles}
                  >
                    <HStack spacing="24px" wrap="wrap"> {/* Added wrap for responsiveness */}
                      {['Hybrid', 'In-Person', 'Remote'].map(style => (
                        <Checkbox key={style} value={style}>{style}</Checkbox>
                      ))}
                    </HStack>
                  </CheckboxGroup>
                </FormControl>

                <FormControl>
                  <FormLabel>Academic Goals</FormLabel>
                  <Input 
                    value={currentAcademicGoal}
                    onChange={(e) => setCurrentAcademicGoal(e.target.value)}
                    placeholder="Type a goal and press Enter"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddItemToList(currentAcademicGoal, academicGoals, setAcademicGoals, setCurrentAcademicGoal);}}}
                  />
                  <Wrap mt={2} spacing={2}>
                    {academicGoals.map(goal => ( <Tag key={goal}> <TagLabel>{goal}</TagLabel> <TagCloseButton onClick={() => removeItemFromList(goal, academicGoals, setAcademicGoals)} /> </Tag> ))}
                  </Wrap>
                </FormControl>
                
                <FormControl>
                  <FormLabel>Areas of Academic Difficulty</FormLabel>
                  <Input /* Similar to Academic Goals input */ 
                    value={currentAreaOfDifficulty}
                    onChange={(e) => setCurrentAreaOfDifficulty(e.target.value)}
                    placeholder="Type a subject/topic and press Enter"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddItemToList(currentAreaOfDifficulty, areasOfDifficulty, setAreasOfDifficulty, setCurrentAreaOfDifficulty);}}}
                  />
                  <Wrap mt={2} spacing={2}>
                    {areasOfDifficulty.map(area => ( <Tag key={area}> <TagLabel>{area}</TagLabel> <TagCloseButton onClick={() => removeItemFromList(area, areasOfDifficulty, setAreasOfDifficulty)} /> </Tag> ))}
                  </Wrap>
                </FormControl>
              </VStack>
            </TabPanel>

            {/* --- INTERESTS & GOALS TAB --- */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <FormControl>
                  <FormLabel>Career Goal</FormLabel>
                  <Textarea value={careerGoal} onChange={e => setCareerGoal(e.target.value)} /* ... */ />
                </FormControl>
                
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

                {/* Extracurricular Activities, Research Interests, Skills - can use the same tag input pattern */}
                <FormControl>
                  <FormLabel>Extracurricular Activities</FormLabel>
                  <Input
                    value={currentExtracurricular}
                    onChange={(e) => setCurrentExtracurricular(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddItemToList(currentExtracurricular, extracurricularActivities, setExtracurricularActivities, setCurrentExtracurricular);}}}
                  />
                  <Wrap mt={2} spacing={2} >{extracurricularActivities.map(act => ( <Tag key={act}><TagLabel>{act}</TagLabel><TagCloseButton onClick={() => removeItemFromList(act, extracurricularActivities, setExtracurricularActivities)} /></Tag> ))}</Wrap>
                </FormControl>
                {/* ... (Similar for Research Interests and Skills) ... */}
              </VStack>
            </TabPanel>

            {/* --- PREFERENCES TAB --- */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <FormControl>
                  <FormLabel>Preferred Study Resources</FormLabel>
                  <CheckboxGroup colorScheme="blue" value={preferredStudyResources} onChange={setPreferredStudyResources}>
                    <VStack align="start">
                      {['Textbooks', 'Online Videos', 'Lecture Slides', 'Practice Problems', 'Study Groups', 'Tutoring'].map(resource => (
                        <Checkbox key={resource} value={resource}>{resource}</Checkbox>
                      ))}
                    </VStack>
                  </CheckboxGroup>
                </FormControl>

                <FormControl>
                  <FormLabel>Communication Preferences (for hypothetical notifications)</FormLabel>
                  <RadioGroup onChange={setCommunicationPreferences} value={communicationPreferences}>
                    <HStack spacing="24px">
                      {['Canvas', 'Discord', 'Piazza'].map(pref => (
                        <Radio key={pref} value={pref}>{pref}</Radio>
                      ))}
                    </HStack>
                  </RadioGroup>
                </FormControl>
              </VStack>
            </TabPanel>

            {/* --- UNIVERSITY SPECIFIC TAB --- */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                {/* Campus Involvement, Use of University Resources - can use tag input or CheckboxGroup */}
                <FormControl>
                  <FormLabel>Campus Involvement (Clubs, Events)</FormLabel>
                  <Input
                    value={currentCampusInvolvement}
                    onChange={(e) => setCurrentCampusInvolvement(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddItemToList(currentCampusInvolvement, campusInvolvement, setCampusInvolvement, setCurrentCampusInvolvement);}}}
                  />
                  <Wrap mt={2} spacing={2} >{campusInvolvement.map(inv => ( <Tag key={inv}><TagLabel>{inv}</TagLabel><TagCloseButton onClick={() => removeItemFromList(inv, campusInvolvement, setCampusInvolvement)} /></Tag> ))}</Wrap>
                </FormControl>

                <FormControl>
                  <FormLabel>Use of University Resources</FormLabel>
                  <CheckboxGroup colorScheme="blue" value={useOfUniversityResources} onChange={setUseOfUniversityResources}>
                    <VStack align="start">
                      {['Tutoring Centers', 'Writing Center', 'Career Services', 'Libraries', 'Health Services'].map(res => (
                        <Checkbox key={res} value={res}>{res}</Checkbox>
                      ))}
                    </VStack>
                  </CheckboxGroup>
                </FormControl>
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      
        <StackDivider borderColor={borderColor} />

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