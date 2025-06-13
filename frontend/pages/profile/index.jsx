// pages/profile/index.jsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
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
  const router = useRouter();

  // --- Academic Tab States ---
  const [currentCourses, setCurrentCourses] = useState(''); // Or an array if you build a list input
  const [learningStyles, setLearningStyles] = useState([]);
  const [academicGoals, setAcademicGoals] = useState([]);
  const [academicInterests, setAcademicInterests] = useState([]);
  const [currentAcademicGoal, setCurrentAcademicGoal] = useState('');
  const [currentAcademicInterest, setCurrentAcademicInterest] = useState('');
  const [areasOfDifficulty, setAreasOfDifficulty] = useState([]);
  const [currentAreaOfDifficulty, setCurrentAreaOfDifficulty] = useState('');
  
  // --- Interests & Goals Tab States ---
  // careerGoal, academicInterests (was 'interests') are existing
  const [extracurricularActivities, setExtracurricularActivities] = useState([]);
  const [currentExtracurricular, setCurrentExtracurricular] = useState('');
  const [researchInterests, setResearchInterests] = useState([]);
  const [skills, setSkills] = useState([]);
  const [preferredStudyResources, setPreferredStudyResources] = useState([]);
  const [communicationPreferences, setCommunicationPreferences] = useState('');

  // --- University Specific Tab States ---
  const [campusInvolvement, setCampusInvolvement] = useState([]);
  const [currentCampusInvolvement, setCurrentCampusInvolvement] = useState('');
  const [useOfUniversityResources, setUseOfUniversityResources] = useState([]); // For CheckboxGroup


  // Form State - initially empty
  const [name, setName] = useState('');
  const [isNameEditing, setIsNameEditing] = useState(false);
  const [selectedPrograms, setSelectedPrograms] = useState([]);
  const [currentResearchInterest, setCurrentResearchInterest] = useState('');
  const [careerGoal, setCareerGoal] = useState('');
  
  // State for the program dropdown and loading indicators
  // const [availablePrograms, setAvailablePrograms] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // For initial data fetch
  const [isSubmitting, setIsSubmitting] = useState(false); // For form submission

  const [semesters, setSemesters] = useState({}); 
  const [newSemesterName, setNewSemesterName] = useState(''); // For the "Add Semester" input
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

  const loadProgramOptions = (inputValue, callback) => {
  // Don't make an API call if the input is too short
  if (!inputValue || inputValue.length < 2) {
    callback([]);
    return;
  }

// Fetch from your API, passing the user's input to the 'q' query parameter
  fetch(`/api/programs?q=${inputValue}`)
    .then(res => res.json())
    .then(data => {
    // The API returns { programs: [...] }, so we need to access that key
    callback(data.programs || []);
    })
    .catch(() => {
    // On error, return an empty array
    callback([]);
    });
  };

  // --- B. UNIFIED USEEFFECT FOR AUTH & DATA LOADING ---
  useEffect(() => {
    const initializeProfile = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.push('/');
        return;
      }

      try {
        const response = await fetch('/api/user/profile', {
          method: 'GET', // Explicitly set GET method
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const { profile } = await response.json();
          if (profile) {
            // Populate all form fields
            setName(profile.name || '');
            setTransferCourses(profile.transferCourses || []);
            setSelectedPrograms(profile.majors?.map(m => ({ label: m, value: m })) || []);
            setAcademicInterests(profile.academicInterests || []);
            setCareerGoal(profile.careerGoal || '');
            setSemesters(profile.semesters || {});
            setCurrentCourses(Array.isArray(profile.currentCourses) ? profile.currentCourses.join(', ') : '');
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
          }
        } else {
          console.error("API response not OK:", await response.text());
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push('/');
      } else {
        setName(session?.user?.name || '');
      }
    });

    return () => {
      subscription?.unsubscribe();
    };

  }, [router]);

  // --- C. CLEANED-UP HANDLESUBMIT FUNCTION ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!name || !name.trim()) {
      alert('Name is a required field. Please enter your name.');
      setIsSubmitting(false); // Stop the loading spinner
      return; // Stop the function from proceeding
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        alert("You must be logged in to save your profile.");
        setIsSubmitting(false);
        return;
    }

    const currentCoursesArray = (currentCourses || '').split(',').map(item => item.trim()).filter(Boolean);
    const profileData = {
      name,
      majors: selectedPrograms.map(p => p.label),
      semesters,
      currentCourses: currentCoursesArray,
      learningStyles,
      academicGoals,
      areasOfDifficulty,
      careerGoal,
      academicInterests,
      extracurricularActivities,
      researchInterests,
      skills,
      preferredStudyResources,
      communicationPreferences,
      campusInvolvement,
      useOfUniversityResources,
      transferCourses,
    };
    
    const formData = new FormData();
    formData.append('profileData', JSON.stringify(profileData));
    if (uploadedFile) {
      formData.append('apasReport', uploadedFile);
    }
    
    try {
        const response = await fetch('/api/user/profile', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
            },
            body: formData,
        });

        if (response.ok) {
            alert('Profile saved successfully!');
            router.reload();
        } else {
            const errorData = await response.json();
            alert(`Failed to save profile: ${errorData.error || 'Unknown error'}`);
        }
    } catch(error) {
        console.error("Error submitting form:", error);
        alert("An error occurred while saving.");
    } finally {
        setIsSubmitting(false);
    }
  };
  
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
    if (acceptedFiles.length > 0) {
      setUploadedFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
  });

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

  if (isLoading) {
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

  const chakraSelectStyles = {
    menu: (provided) => ({
      ...provided,
      bg: useColorModeValue('white', 'gray.700'),
      borderColor: borderColor,
      boxShadow: 'lg',
    }),
    option: (provided, state) => ({
      ...provided,
      bg: state.isFocused 
          ? useColorModeValue('gray.100', 'gray.600') 
          : 'transparent',
      ...(state.isSelected && {
        bg: useColorModeValue('blue.500', 'blue.400'),
        color: 'white',
        _hover: {
          bg: useColorModeValue('blue.600', 'blue.500'),
        }
      }),
      color: useColorModeValue('gray.800', 'whiteAlpha.800'),
    }),
    control: (provided, state) => ({
      ...provided,
      minHeight: '48px',
      bg: useColorModeValue('white', 'gray.800'),
      borderColor: borderColor,
      boxShadow: state.isFocused ? `0 0 0 1px ${focusBorderColor}` : 'none',
      '&:hover': {
        borderColor: focusBorderColor,
      }
    }),
    singleValue: (provided) => ({
        ...provided,
        color: useColorModeValue('gray.800', 'whiteAlpha.800'),
    }),
    placeholder: (provided) => ({
        ...provided,
        color: useColorModeValue('gray.500', 'gray.400'),
    }),
  };

  if (isLoading) {
    return (
      <Flex justify="center" align="center" height="100vh">
        <Spinner size="xl" />
      </Flex>
    );
  }

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

        <Tabs variant="soft-rounded" colorScheme="blue" isLazy>
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
                    placeholder="Search for your majors and minors..."
                    loadOptions={loadProgramOptions} // Pass the loading function here
                    value={selectedPrograms}
                    onChange={setSelectedPrograms}
                    cacheOptions // Caches results to avoid repeated API calls for the same query
                    defaultOptions // Can be `true` to load initial options or an array of default options
                    chakraStyles={chakraSelectStyles}
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
                                  chakraStyles={chakraSelectStyles}
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
                    <HStack spacing="24px" wrap="wrap">
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
                  <Input 
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
                
                <FormControl id="academicInterests">
                  <FormLabel>Academic Interests</FormLabel>
                  <Input
                    value={currentAcademicInterest}
                    onChange={(e) => setCurrentAcademicInterest(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddItemToList(currentAcademicInterest, academicInterests, setAcademicInterests, setCurrentAcademicInterest);}}}
                    placeholder="Type an interest and press Enter"
                    focusBorderColor={inputFocusBorderColor}
                  />
                  <Wrap mt={2} spacing={2}>
                    {academicInterests.map(interest => (
                      <WrapItem key={interest}>
                        <Tag size="md" borderRadius="full" variant="solid" colorScheme="blue">
                          <TagLabel>{interest}</TagLabel>
                          <TagCloseButton onClick={() => removeItemFromList(interest, academicInterests, setAcademicInterests)} />
                        </Tag>
                      </WrapItem>
                    ))}
                  </Wrap>
                </FormControl>

                <FormControl id="research_interests">
                  <FormLabel>Research Interests</FormLabel>
                  <Input
                    value={currentResearchInterest}
                    onChange={(e) => setCurrentResearchInterest(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddItemToList(currentResearchInterest, researchInterests, setResearchInterests, setCurrentResearchInterest);}}}
                    placeholder="Type an interest and press Enter"
                    focusBorderColor={inputFocusBorderColor}
                  />
                  <Wrap mt={2} spacing={2}>
                    {researchInterests.map(interest => (
                      <WrapItem key={interest}>
                        <Tag size="md" borderRadius="full" variant="solid" colorScheme="teal">
                          <TagLabel>{interest}</TagLabel>
                          <TagCloseButton onClick={() => removeItemFromList(interest, researchInterests, setResearchInterests)} />
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
                    placeholder="Type an interest and press Enter"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddItemToList(currentExtracurricular, extracurricularActivities, setExtracurricularActivities, setCurrentExtracurricular);}}}
                  />
                  <Wrap mt={2} spacing={2} >{extracurricularActivities.map(act => ( <Tag key={act}><TagLabel>{act}</TagLabel><TagCloseButton onClick={() => removeItemFromList(act, extracurricularActivities, setExtracurricularActivities)} /></Tag> ))}</Wrap>
                </FormControl>
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
                    placeholder="Type a Campus involvement and press Enter"
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