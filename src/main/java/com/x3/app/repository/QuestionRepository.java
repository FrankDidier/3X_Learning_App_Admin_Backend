package com.x3.app.repository;

import com.x3.app.model.Course;
import com.x3.app.model.Question;
import com.x3.app.model.Quiz;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuestionRepository extends JpaRepository<Question, Long> {
    List<Question> findByQuiz(Quiz quiz);
    List<Question> findByDifficulty(Course.Difficulty difficulty);
    List<Question> findByKnowledgePointContaining(String knowledgePoint);
    
    @Query("SELECT q FROM Question q WHERE q.knowledgePoint LIKE %?1% ORDER BY RAND() LIMIT ?2")
    List<Question> findRandomQuestionsByKnowledgePoint(String knowledgePoint, int limit);
    
    @Query("SELECT q FROM Question q WHERE q.difficulty = ?1 ORDER BY RAND() LIMIT ?2")
    List<Question> findRandomQuestionsByDifficulty(Course.Difficulty difficulty, int limit);
}