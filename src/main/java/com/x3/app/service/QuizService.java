package com.x3.app.service;

import com.x3.app.model.*;
import com.x3.app.repository.QuestionRepository;
import com.x3.app.repository.QuizRepository;
import com.x3.app.repository.UserQuizAttemptRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class QuizService {
    
    private final QuizRepository quizRepository;
    private final QuestionRepository questionRepository;
    private final UserQuizAttemptRepository attemptRepository;
    
    public List<Quiz> getAllQuizzes() {
        return quizRepository.findAll();
    }
    
    public Optional<Quiz> getQuizById(Long id) {
        return quizRepository.findById(id);
    }
    
    public List<Quiz> getQuizzesByCourse(Course course) {
        return quizRepository.findByCourse(course);
    }
    
    public List<Quiz> getQuizzesByDifficulty(Course.Difficulty difficulty) {
        return quizRepository.findByDifficulty(difficulty);
    }
    
    public List<Quiz> getQuizzesByCategoryAndLevelAndDifficulty(
            Course.Category category, Course.Level level, Course.Difficulty difficulty) {
        return quizRepository.findByCategoryAndLevelAndDifficulty(category, level, difficulty);
    }
    
    public List<Quiz> getRandomQuizzes(
            Course.Category category, Course.Level level, Course.Difficulty difficulty, int limit) {
        return quizRepository.findRandomQuizzes(category, level, difficulty, limit);
    }
    
    @Transactional
    public Quiz createQuiz(Quiz quiz) {
        return quizRepository.save(quiz);
    }
    
    @Transactional
    public Quiz updateQuiz(Quiz quiz) {
        return quizRepository.save(quiz);
    }
    
    @Transactional
    public void deleteQuiz(Long id) {
        quizRepository.deleteById(id);
    }
    
    // Question methods
    
    public List<Question> getQuestionsByQuiz(Quiz quiz) {
        return questionRepository.findByQuiz(quiz);
    }
    
    public Optional<Question> getQuestionById(Long id) {
        return questionRepository.findById(id);
    }
    
    public List<Question> getQuestionsByDifficulty(Course.Difficulty difficulty) {
        return questionRepository.findByDifficulty(difficulty);
    }
    
    public List<Question> getQuestionsByKnowledgePoint(String knowledgePoint) {
        return questionRepository.findByKnowledgePointContaining(knowledgePoint);
    }
    
    public List<Question> getRandomQuestionsByKnowledgePoint(String knowledgePoint, int limit) {
        return questionRepository.findRandomQuestionsByKnowledgePoint(knowledgePoint, limit);
    }
    
    public List<Question> getRandomQuestionsByDifficulty(Course.Difficulty difficulty, int limit) {
        return questionRepository.findRandomQuestionsByDifficulty(difficulty, limit);
    }
    
    @Transactional
    public Question createQuestion(Question question) {
        return questionRepository.save(question);
    }
    
    @Transactional
    public Question updateQuestion(Question question) {
        return questionRepository.save(question);
    }
    
    @Transactional
    public void deleteQuestion(Long id) {
        questionRepository.deleteById(id);
    }
    
    // Quiz Attempt methods
    
    public List<UserQuizAttempt> getAttemptsByUser(User user) {
        return attemptRepository.findByUserOrderByCreatedAtDesc(user);
    }
    
    public List<UserQuizAttempt> getAttemptsByUserAndQuiz(User user, Quiz quiz) {
        return attemptRepository.findByUserAndQuiz(user, quiz);
    }
    
    public Optional<UserQuizAttempt> getAttemptById(Long id) {
        return attemptRepository.findById(id);
    }
    
    @Transactional
    public UserQuizAttempt startQuizAttempt(User user, Quiz quiz) {
        UserQuizAttempt attempt = new UserQuizAttempt();
        attempt.setUser(user);
        attempt.setQuiz(quiz);
        attempt.setStartTime(LocalDateTime.now());
        attempt.setTotalQuestions(quiz.getQuestionCount());
        
        return attemptRepository.save(attempt);
    }
    
    @Transactional
    public UserQuizAttempt completeQuizAttempt(UserQuizAttempt attempt, List<UserAnswer> answers) {
        attempt.setEndTime(LocalDateTime.now());
        
        // Calculate time spent
        int timeSpentSeconds = (int) java.time.Duration.between(attempt.getStartTime(), attempt.getEndTime()).getSeconds();
        attempt.setTimeSpentSeconds(timeSpentSeconds);
        
        // Process answers
        int correctCount = 0;
        for (UserAnswer answer : answers) {
            answer.setAttempt(attempt);
            if (answer.isCorrect()) {
                correctCount++;
            }
        }
        
        attempt.setAnswers(answers);
        attempt.setCorrectAnswers(correctCount);
        
        // Calculate score (0-100)
        double score = (double) correctCount / attempt.getTotalQuestions() * 100;
        attempt.setScore(score);
        
        return attemptRepository.save(attempt);
    }
    
    public Long countLowScoreAttempts(User user) {
        return attemptRepository.countLowScoreAttempts(user);
    }
    
    public List<UserQuizAttempt> getLast3AttemptsByUser(User user) {
        return attemptRepository.findLast3AttemptsByUser(user);
    }
    
    public Double getAverageScoreByCategoryAndLevel(Course.Category category, Course.Level level) {
        return attemptRepository.getAverageScoreByCategoryAndLevel(category, level);
    }
}