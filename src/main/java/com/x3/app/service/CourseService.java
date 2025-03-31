package com.x3.app.service;

import com.x3.app.model.Course;
import com.x3.app.model.CourseSection;
import com.x3.app.repository.CourseSectionRepository;
import com.x3.app.repository.CourseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CourseService {
    
    private final CourseRepository courseRepository;
    private final CourseSectionRepository sectionRepository;
    
    public List<Course> getAllCourses() {
        return courseRepository.findAll();
    }
    
    public Optional<Course> getCourseById(Long id) {
        return courseRepository.findById(id);
    }
    
    public List<Course> getCoursesByCategory(Course.Category category) {
        return courseRepository.findByCategory(category);
    }
    
    public List<Course> getCoursesByLevel(Course.Level level) {
        return courseRepository.findByLevel(level);
    }
    
    public List<Course> getCoursesByDifficulty(Course.Difficulty difficulty) {
        return courseRepository.findByDifficulty(difficulty);
    }
    
    public List<Course> getCoursesByCategoryAndLevel(Course.Category category, Course.Level level) {
        return courseRepository.findByCategoryAndLevel(category, level);
    }
    
    public List<Course> getCoursesByCategoryAndLevelAndDifficulty(
            Course.Category category, Course.Level level, Course.Difficulty difficulty) {
        return courseRepository.findByCategoryAndLevelAndDifficulty(category, level, difficulty);
    }
    
    public List<Course> getRandomCourses(
            Course.Category category, Course.Level level, Course.Difficulty difficulty, int limit) {
        return courseRepository.findRandomCourses(category, level, difficulty, limit);
    }
    
    @Transactional
    public Course createCourse(Course course) {
        return courseRepository.save(course);
    }
    
    @Transactional
    public Course updateCourse(Course course) {
        return courseRepository.save(course);
    }
    
    @Transactional
    public void deleteCourse(Long id) {
        courseRepository.deleteById(id);
    }
    
    // Course Section methods
    
    public List<CourseSection> getSectionsByCourse(Course course) {
        return sectionRepository.findByCourseOrderByOrderIndexAsc(course);
    }
    
    public Optional<CourseSection> getSectionById(Long id) {
        return sectionRepository.findById(id);
    }
    
    @Transactional
    public CourseSection createSection(CourseSection section) {
        return sectionRepository.save(section);
    }
    
    @Transactional
    public CourseSection updateSection(CourseSection section) {
        return sectionRepository.save(section);
    }
    
    @Transactional
    public void deleteSection(Long id) {
        sectionRepository.deleteById(id);
    }
}