package com.x3.app.controller;

import com.x3.app.model.Course;
import com.x3.app.model.CourseSection;
import com.x3.app.model.User;
import com.x3.app.model.UserSectionProgress;
import com.x3.app.payload.response.MessageResponse;
import com.x3.app.security.services.UserDetailsImpl;
import com.x3.app.service.CourseService;
import com.x3.app.service.UserProgressService;
import com.x3.app.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/courses")
@RequiredArgsConstructor
public class CourseController {
    
    private final CourseService courseService;
    private final UserService userService;
    private final UserProgressService userProgressService;
    
    @GetMapping
    public ResponseEntity<List<Course>> getAllCourses() {
        List<Course> courses = courseService.getAllCourses();
        return ResponseEntity.ok(courses);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<?> getCourseById(@PathVariable Long id) {
        Optional<Course> course = courseService.getCourseById(id);
        if (course.isPresent()) {
            return ResponseEntity.ok(course.get());
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    @GetMapping("/category/{category}")
    public ResponseEntity<List<Course>> getCoursesByCategory(@PathVariable String category) {
        try {
            Course.Category categoryEnum = Course.Category.valueOf(category);
            List<Course> courses = courseService.getCoursesByCategory(categoryEnum);
            return ResponseEntity.ok(courses);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/level/{level}")
    public ResponseEntity<List<Course>> getCoursesByLevel(@PathVariable String level) {
        try {
            Course.Level levelEnum = Course.Level.valueOf(level);
            List<Course> courses = courseService.getCoursesByLevel(levelEnum);
            return ResponseEntity.ok(courses);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/difficulty/{difficulty}")
    public ResponseEntity<List<Course>> getCoursesByDifficulty(@PathVariable String difficulty) {
        try {
            Course.Difficulty difficultyEnum = Course.Difficulty.valueOf(difficulty);
            List<Course> courses = courseService.getCoursesByDifficulty(difficultyEnum);
            return ResponseEntity.ok(courses);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/filter")
    public ResponseEntity<List<Course>> filterCourses(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) String difficulty) {
        
        try {
            if (category != null && level != null && difficulty != null) {
                Course.Category categoryEnum = Course.Category.valueOf(category);
                Course.Level levelEnum = Course.Level.valueOf(level);
                Course.Difficulty difficultyEnum = Course.Difficulty.valueOf(difficulty);
                
                List<Course> courses = courseService.getCoursesByCategoryAndLevelAndDifficulty(
                        categoryEnum, levelEnum, difficultyEnum);
                return ResponseEntity.ok(courses);
            } else if (category != null && level != null) {
                Course.Category categoryEnum = Course.Category.valueOf(category);
                Course.Level levelEnum = Course.Level.valueOf(level);
                
                List<Course> courses = courseService.getCoursesByCategoryAndLevel(categoryEnum, levelEnum);
                return ResponseEntity.ok(courses);
            } else if (category != null) {
                Course.Category categoryEnum = Course.Category.valueOf(category);
                List<Course> courses = courseService.getCoursesByCategory(categoryEnum);
                return ResponseEntity.ok(courses);
            } else if (level != null) {
                Course.Level levelEnum = Course.Level.valueOf(level);
                List<Course> courses = courseService.getCoursesByLevel(levelEnum);
                return ResponseEntity.ok(courses);
            } else if (difficulty != null) {
                Course.Difficulty difficultyEnum = Course.Difficulty.valueOf(difficulty);
                List<Course> courses = courseService.getCoursesByDifficulty(difficultyEnum);
                return ResponseEntity.ok(courses);
            } else {
                List<Course> courses = courseService.getAllCourses();
                return ResponseEntity.ok(courses);
            }
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/random")
    public ResponseEntity<List<Course>> getRandomCourses(
            @RequestParam String category,
            @RequestParam String level,
            @RequestParam String difficulty,
            @RequestParam(defaultValue = "3") int limit) {
        
        try {
            Course.Category categoryEnum = Course.Category.valueOf(category);
            Course.Level levelEnum = Course.Level.valueOf(level);
            Course.Difficulty difficultyEnum = Course.Difficulty.valueOf(difficulty);
            
            List<Course> courses = courseService.getRandomCourses(categoryEnum, levelEnum, difficultyEnum, limit);
            return ResponseEntity.ok(courses);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('TEACHER')")
    public ResponseEntity<Course> createCourse(@RequestBody Course course) {
        Course createdCourse = courseService.createCourse(course);
        return ResponseEntity.ok(createdCourse);
    }
    
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('TEACHER')")
    public ResponseEntity<?> updateCourse(@PathVariable Long id, @RequestBody Course course) {
        Optional<Course> existingCourse = courseService.getCourseById(id);
        
        if (existingCourse.isPresent()) {
            course.setId(id);
            Course updatedCourse = courseService.updateCourse(course);
            return ResponseEntity.ok(updatedCourse);
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteCourse(@PathVariable Long id) {
        Optional<Course> existingCourse = courseService.getCourseById(id);
        
        if (existingCourse.isPresent()) {
            courseService.deleteCourse(id);
            return ResponseEntity.ok(new MessageResponse("Course deleted successfully"));
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    // Course Section endpoints
    
    @GetMapping("/{courseId}/sections")
    public ResponseEntity<?> getSectionsByCourse(@PathVariable Long courseId) {
        Optional<Course> course = courseService.getCourseById(courseId);
        
        if (course.isPresent()) {
            List<CourseSection> sections = courseService.getSectionsByCourse(course.get());
            return ResponseEntity.ok(sections);
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    @GetMapping("/sections/{sectionId}")
    public ResponseEntity<?> getSectionById(@PathVariable Long sectionId) {
        Optional<CourseSection> section = courseService.getSectionById(sectionId);
        
        if (section.isPresent()) {
            return ResponseEntity.ok(section.get());
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    @PostMapping("/{courseId}/sections")
    @PreAuthorize("hasRole('ADMIN') or hasRole('TEACHER')")
    public ResponseEntity<?> createSection(@PathVariable Long courseId, @RequestBody CourseSection section) {
        Optional<Course> course = courseService.getCourseById(courseId);
        
        if (course.isPresent()) {
            section.setCourse(course.get());
            CourseSection createdSection = courseService.createSection(section);
            return ResponseEntity.ok(createdSection);
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    @PutMapping("/sections/{sectionId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('TEACHER')")
    public ResponseEntity<?> updateSection(@PathVariable Long sectionId, @RequestBody CourseSection section) {
        Optional<CourseSection> existingSection = courseService.getSectionById(sectionId);
        
        if (existingSection.isPresent()) {
            section.setId(sectionId);
            section.setCourse(existingSection.get().getCourse());
            CourseSection updatedSection = courseService.updateSection(section);
            return ResponseEntity.ok(updatedSection);
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    @DeleteMapping("/sections/{sectionId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteSection(@PathVariable Long sectionId) {
        Optional<CourseSection> existingSection = courseService.getSectionById(sectionId);
        
        if (existingSection.isPresent()) {
            courseService.deleteSection(sectionId);
            return ResponseEntity.ok(new MessageResponse("Section deleted successfully"));
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    // User Progress endpoints
    
    @GetMapping("/progress")
    public ResponseEntity<?> getUserProgress() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> user = userService.getUserById(userDetails.getId());
        
        if (user.isPresent()) {
            List<UserSectionProgress> progress = userProgressService.getUserProgress(user.get());
            return ResponseEntity.ok(progress);
        } else {
            return ResponseEntity.badRequest().body(new MessageResponse("User not found"));
        }
    }
    
    @PostMapping("/sections/{sectionId}/progress")
    public ResponseEntity<?> updateSectionProgress(
            @PathVariable Long sectionId,
            @RequestParam boolean completed,
            @RequestParam(required = false, defaultValue = "false") boolean skipped) {
        
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> user = userService.getUserById(userDetails.getId());
        Optional<CourseSection> section = courseService.getSectionById(sectionId);
        
        if (user.isPresent() && section.isPresent()) {
            UserSectionProgress progress = userProgressService.createOrUpdateProgress(
                    user.get(), section.get(), completed, skipped);
            return ResponseEntity.ok(progress);
        } else {
            return ResponseEntity.badRequest().body(new MessageResponse("User or Section not found"));
        }
    }
    
    @GetMapping("/recommendations")
    public ResponseEntity<?> getRecommendations() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> optionalUser = userService.getUserById(userDetails.getId());
        
        if (optionalUser.isPresent()) {
            User user = optionalUser.get();
            
            // Check if user has stagnant progress
            List<UserSectionProgress> stagnantProgress = userProgressService.findStagnantProgress(user, 7);
            
            if (!stagnantProgress.isEmpty()) {
                // Recommend courses related to stagnant sections
                List<Course> recommendedCourses = stagnantProgress.stream()
                        .map(progress -> progress.getSection().getCourse())
                        .distinct()
                        .limit(3)
                        .collect(Collectors.toList());
                
                return ResponseEntity.ok(recommendedCourses);
            } else {
                // Provide random recommendations based on completed courses
                // This is a simplified recommendation logic
                return ResponseEntity.ok(courseService.getRandomCourses(
                        Course.Category.CATEGORY_1,
                        Course.Level.LEVEL_1,
                        Course.Difficulty.BASIC,
                        3));
            }
        } else {
            return ResponseEntity.badRequest().body(new MessageResponse("User not found"));
        }
    }
}