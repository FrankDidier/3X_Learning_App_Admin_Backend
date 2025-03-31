package com.x3.app.repository;

import com.x3.app.model.Course;
import com.x3.app.model.Quiz;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuizRepository extends JpaRepository<Quiz, Long> {
    List<Quiz> findByCourse(Course course);
    List<Quiz> findByDifficulty(Course.Difficulty difficulty);
    
    @Query("SELECT q FROM Quiz q WHERE q.course.category = ?1 AND q.course.level = ?2 AND q.difficulty = ?3")
    List<Quiz> findByCategoryAndLevelAndDifficulty(
        Course.Category category, 
        Course.Level level, 
        Course.Difficulty difficulty
    );
    
    @Query("SELECT q FROM Quiz q WHERE q.course.category = ?1 AND q.course.level = ?2 AND q.difficulty = ?3 ORDER BY RAND() LIMIT ?4")
    List<Quiz> findRandomQuizzes(
        Course.Category category, 
        Course.Level level, 
        Course.Difficulty difficulty, 
        int limit
    );
}