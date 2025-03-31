package com.x3.app.repository;

import com.x3.app.model.Quiz;
import com.x3.app.model.User;
import com.x3.app.model.UserQuizAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserQuizAttemptRepository extends JpaRepository<UserQuizAttempt, Long> {
    List<UserQuizAttempt> findByUser(User user);
    List<UserQuizAttempt> findByUserOrderByCreatedAtDesc(User user);
    List<UserQuizAttempt> findByUserAndQuiz(User user, Quiz quiz);
    
    @Query("SELECT COUNT(uqa) FROM UserQuizAttempt uqa WHERE uqa.user = ?1 AND uqa.score < 60")
    Long countLowScoreAttempts(User user);
    
    @Query("SELECT uqa FROM UserQuizAttempt uqa WHERE uqa.user = ?1 ORDER BY uqa.createdAt DESC LIMIT 3")
    List<UserQuizAttempt> findLast3AttemptsByUser(User user);
    
    @Query("SELECT AVG(uqa.score) FROM UserQuizAttempt uqa WHERE uqa.quiz.course.category = ?1 AND uqa.quiz.course.level = ?2")
    Double getAverageScoreByCategoryAndLevel(Course.Category category, Course.Level level);
}