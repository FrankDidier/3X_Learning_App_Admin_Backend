package com.x3.app.controller;

import com.x3.app.model.*;
import com.x3.app.payload.request.QuizAttemptRequest;
import com.x3.app.payload.response.MessageResponse;
import com.x3.app.security.services.UserDetailsImpl;
import com.x3.app.service.QuizService;
import com.x3.app.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/quizzes")
@RequiredArgsConstructor
public class QuizController {
    
    private final QuizService quizService;
    private final UserService userService;
    
    @GetMapping
    public ResponseEntity<List<Quiz>> getAllQuizzes() {
        List<Quiz> quizzes = quizService.getAllQuizzes();
        return ResponseEntity.ok(quizzes);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<?> getQuizById(@PathVariable Long id) {
        Optional<Quiz> quiz = quizService.getQuizById(id);
        
        if (quiz.isPresent()) {
            return ResponseEntity.ok(quiz.get());
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    @GetMapping("/course/{courseId}")
    public ResponseEntity<?> getQuizzesByCourse(@PathVariable Long courseId) {
        Optional<Course> course = Optional.of(new Course()); // Replace with actual course service
        course.get().setId(courseId);
        
        if (course.isPresent()) {
            List<Quiz> quizzes = quizService.getQuizzesByCourse(course.get());
            return ResponseEntity.ok(quizzes);
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    @GetMapping("/difficulty/{difficulty}")
    public ResponseEntity<List<Quiz>> getQuizzesByDifficulty(@PathVariable String difficulty) {
        try {
            Course.Difficulty difficultyEnum = Course.Difficulty.valueOf(difficulty);
            List<Quiz> quizzes = quizService.getQuizzesByDifficulty(difficultyEnum);
            return ResponseEntity.ok(quizzes);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/filter")
    public ResponseEntity<List<Quiz>> filterQuizzes(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) String difficulty) {
        
        try {
            if (category != null && level != null && difficulty != null) {
                Course.Category categoryEnum = Course.Category.valueOf(category);
                Course.Level levelEnum = Course.Level.valueOf(level);
                Course.Difficulty difficultyEnum = Course.Difficulty.valueOf(difficulty);
                
                List<Quiz> quizzes = quizService.getQuizzesByCategoryAndLevelAndDifficulty(
                        categoryEnum, levelEnum, difficultyEnum);
                return ResponseEntity.ok(quizzes);
            } else {
                List<Quiz> quizzes = quizService.getAllQuizzes();
                return ResponseEntity.ok(quizzes);
            }
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/random")
    public ResponseEntity<List<Quiz>> getRandomQuizzes(
            @RequestParam String category,
            @RequestParam String level,
            @RequestParam String difficulty,
            @RequestParam(defaultValue = "3") int limit) {
        
        try {
            Course.Category categoryEnum = Course.Category.valueOf(category);
            Course.Level levelEnum = Course.Level.valueOf(level);
            Course.Difficulty difficultyEnum = Course.Difficulty.valueOf(difficulty);
            
            List<Quiz> quizzes = quizService.getRandomQuizzes(categoryEnum, levelEnum, difficultyEnum, limit);
            return ResponseEntity.ok(quizzes);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('TEACHER')")
    public ResponseEntity<Quiz> createQuiz(@RequestBody Quiz quiz) {
        Quiz createdQuiz = quizService.createQuiz(quiz);
        return ResponseEntity.ok(createdQuiz);
    }
    
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('TEACHER')")
    public ResponseEntity<?> updateQuiz(@PathVariable Long id, @RequestBody Quiz quiz) {
        Optional<Quiz> existingQuiz = quizService.getQuizById(id);
        
        if (existingQuiz.isPresent()) {
            quiz.setId(id);
            Quiz updatedQuiz = quizService.updateQuiz(quiz);
            return ResponseEntity.ok(updatedQuiz);
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteQuiz(@PathVariable Long id) {
        Optional<Quiz> existingQuiz = quizService.getQuizById(id);
        
        if (existingQuiz.isPresent()) {
            quizService.deleteQuiz(id);
            return ResponseEntity.ok(new MessageResponse("Quiz deleted successfully"));
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    // Question endpoints
    
    @GetMapping("/{quizId}/questions")
    public ResponseEntity<?> getQuestionsByQuiz(@PathVariable Long quizId) {
        Optional<Quiz> quiz = quizService.getQuizById(quizId);
        
        if (quiz.isPresent()) {
            List<Question> questions = quizService.getQuestionsByQuiz(quiz.get());
            return ResponseEntity.ok(questions);
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    @GetMapping("/questions/{questionId}")
    public ResponseEntity<?> getQuestionById(@PathVariable Long questionId) {
        Optional<Question> question = quizService.getQuestionById(questionId);
        
        if (question.isPresent()) {
            return ResponseEntity.ok(question.get());
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    @PostMapping("/{quizId}/questions")
    @PreAuthorize("hasRole('ADMIN') or hasRole('TEACHER')")
    public ResponseEntity<?> createQuestion(@PathVariable Long quizId, @RequestBody Question question) {
        Optional<Quiz> quiz = quizService.getQuizById(quizId);
        
        if (quiz.isPresent()) {
            question.setQuiz(quiz.get());
            Question createdQuestion = quizService.createQuestion(question);
            return ResponseEntity.ok(createdQuestion);
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    @PutMapping("/questions/{questionId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('TEACHER')")
    public ResponseEntity<?> updateQuestion(@PathVariable Long questionId, @RequestBody Question question) {
        Optional<Question> existingQuestion = quizService.getQuestionById(questionId);
        
        if (existingQuestion.isPresent()) {
            question.setId(questionId);
            question.setQuiz(existingQuestion.get().getQuiz());
            Question updatedQuestion = quizService.updateQuestion(question);
            return ResponseEntity.ok(updatedQuestion);
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    @DeleteMapping("/questions/{questionId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteQuestion(@PathVariable Long questionId) {
        Optional<Question> existingQuestion = quizService.getQuestionById(questionId);
        
        if (existingQuestion.isPresent()) {
            quizService.deleteQuestion(questionId);
            return ResponseEntity.ok(new MessageResponse("Question deleted successfully"));
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    // Quiz Attempt endpoints
    
    @GetMapping("/attempts")
    public ResponseEntity<?> getUserAttempts() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> user = userService.getUserById(userDetails.getId());
        
        if (user.isPresent()) {
            List<UserQuizAttempt> attempts = quizService.getAttemptsByUser(user.get());
            return ResponseEntity.ok(attempts);
        } else {
            return ResponseEntity.badRequest().body(new MessageResponse("User not found"));
        }
    }
    
    @GetMapping("/attempts/{attemptId}")
    public ResponseEntity<?> getAttemptById(@PathVariable Long attemptId) {
        Optional<UserQuizAttempt> attempt = quizService.getAttemptById(attemptId);
        
        if (attempt.isPresent()) {
            return ResponseEntity.ok(attempt.get());
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    @PostMapping("/{quizId}/start")
    public ResponseEntity<?> startQuizAttempt(@PathVariable Long quizId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> user = userService.getUserById(userDetails.getId());
        Optional<Quiz> quiz = quizService.getQuizById(quizId);
        
        if (user.isPresent() && quiz.isPresent()) {
            UserQuizAttempt attempt = quizService.startQuizAttempt(user.get(), quiz.get());
            return ResponseEntity.ok(attempt);
        } else {
            return ResponseEntity.badRequest().body(new MessageResponse("User or Quiz not found"));
        }
    }
    
    @PostMapping("/{quizId}/complete")
    public ResponseEntity<?> completeQuizAttempt(
            @PathVariable Long quizId,
            @RequestBody QuizAttemptRequest attemptRequest) {
        
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> user = userService.getUserById(userDetails.getId());
        Optional<UserQuizAttempt> attempt = quizService.getAttemptById(attemptRequest.getAttemptId());
        
        if (user.isPresent() && attempt.isPresent()) {
            UserQuizAttempt userAttempt = attempt.get();
            
            // Verify that the attempt belongs to the authenticated user
            if (!userAttempt.getUser().getId().equals(user.get().getId())) {
                return ResponseEntity.badRequest().body(new MessageResponse("Unauthorized access to quiz attempt"));
            }
            
            // Convert the answers from the request to UserAnswer objects
            List<UserAnswer> userAnswers = new ArrayList<>();
            attemptRequest.getAnswers().forEach(answerRequest -> {
                UserAnswer userAnswer = new UserAnswer();
                userAnswer.setQuestionId(answerRequest.getQuestionId());
                userAnswer.setSelectedOption(answerRequest.getSelectedOption());
                userAnswer.setCorrect(answerRequest.isCorrect());
                userAnswers.add(userAnswer);
            });
            
            UserQuizAttempt completedAttempt = quizService.completeQuizAttempt(userAttempt, userAnswers);
            return ResponseEntity.ok(completedAttempt);
        } else {
            return ResponseEntity.badRequest().body(new MessageResponse("User or Attempt not found"));
        }
    }
    
    @GetMapping("/statistics")
    public ResponseEntity<?> getUserQuizStatistics() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> user = userService.getUserById(userDetails.getId());
        
        if (user.isPresent()) {
            // Get the last 3 attempts
            List<UserQuizAttempt> recentAttempts = quizService.getLast3AttemptsByUser(user.get());
            
            // Calculate average score for different categories
            Double mathAvg = quizService.getAverageScoreByCategoryAndLevel(
                    Course.Category.CATEGORY_1, Course.Level.LEVEL_1);
            Double scienceAvg = quizService.getAverageScoreByCategoryAndLevel(
                    Course.Category.CATEGORY_2, Course.Level.LEVEL_1);
            
            // Create a response object with statistics
            // This would be a custom response class in a real implementation
            return ResponseEntity.ok(
                    new Object() {
                        public final List<UserQuizAttempt> recent = recentAttempts;
                        public final Double mathAverage = mathAvg;
                        public final Double scienceAverage = scienceAvg;
                    }
            );
        } else {
            return ResponseEntity.badRequest().body(new MessageResponse("User not found"));
        }
    }
}