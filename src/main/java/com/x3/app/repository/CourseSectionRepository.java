package com.x3.app.repository;

import com.x3.app.model.Course;
import com.x3.app.model.CourseSection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CourseSectionRepository extends JpaRepository<CourseSection, Long> {
    List<CourseSection> findByCourseOrderByOrderIndexAsc(Course course);
}