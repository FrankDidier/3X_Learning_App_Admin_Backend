package com.x3.app.service;

import com.x3.app.model.CourseSection;
import com.x3.app.model.User;
import com.x3.app.model.UserQuizAttempt;
import com.x3.app.model.UserSectionProgress;
import com.x3.app.repository.UserQuizAttemptRepository;
import com.x3.app.repository.UserSectionProgressRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserProgressService {
    
    private final UserSectionProgressRepository progressRepository;
    private final UserQuizAttemptRepository attemptRepository;
    
    public List<UserSectionProgress> getUserProgress(User user) {
        return progressRepository.findByUser(user);
    }
    
    public Optional<UserSectionProgress> getUserProgressForSection(User user, CourseSection section) {
        return progressRepository.findByUserAndSection(user, section);
    }
    
    @Transactional
    public UserSectionProgress createOrUpdateProgress(User user, CourseSection section, boolean completed, boolean skipped) {
        Optional<UserSectionProgress> existingProgress = progressRepository.findByUserAndSection(user, section);
        
        UserSectionProgress progress;
        if (existingProgress.isPresent()) {
            progress = existingProgress.get();
            progress.setCompleted(completed);
            progress.setSkipped(skipped);
            
            if (!skipped && !completed && progress.getRepeatCount() != null) {
                progress.setRepeatCount(progress.getRepeatCount() + 1);
            }
        } else {
            progress = new UserSectionProgress();
            progress.setUser(user);
            progress.setSection(section);
            progress.setCompleted(completed);
            progress.setSkipped(skipped);
            progress.setRepeatCount(0);
        }
        
        return progressRepository.save(progress);
    }
    
    public List<UserSectionProgress> findStagnantProgress(User user, int daysThreshold) {
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(daysThreshold);
        return progressRepository.findStagnantProgress(user, cutoffDate);
    }
    
    public Long countCompletedSectionsByUser(User user) {
        return progressRepository.countCompletedSectionsByUser(user);
    }
    
    public boolean checkConsecutiveLowScores(User user, int threshold) {
        List<UserQuizAttempt> recentAttempts = attemptRepository.findLast3AttemptsByUser(user);
        
        if (recentAttempts.size() < 3) {
            return false;
        }
        
        int lowScoreCount = 0;
        for (UserQuizAttempt attempt : recentAttempts) {
            if (attempt.getScore() < 60) {
                lowScoreCount++;
            }
        }
        
        return lowScoreCount >= threshold;
    }
}