package com.x3.app.service;

import com.x3.app.model.AiAssistanceLog;
import com.x3.app.model.User;
import com.x3.app.repository.AiAssistanceLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AiAssistanceService {
    
    private final AiAssistanceLogRepository aiAssistanceLogRepository;
    
    public List<AiAssistanceLog> getAllAiAssistanceLogs() {
        return aiAssistanceLogRepository.findAll();
    }
    
    public Optional<AiAssistanceLog> getAiAssistanceLogById(Long id) {
        return aiAssistanceLogRepository.findById(id);
    }
    
    public List<AiAssistanceLog> getAiAssistanceLogsByUser(User user) {
        return aiAssistanceLogRepository.findByUserOrderByCreatedAtDesc(user);
    }
    
    public List<AiAssistanceLog> getUnansweredAiAssistanceLogs() {
        return aiAssistanceLogRepository.findByAnsweredFalse();
    }
    
    public Long countRecentQueriesByUser(User user, int hoursThreshold) {
        LocalDateTime since = LocalDateTime.now().minusHours(hoursThreshold);
        return aiAssistanceLogRepository.countRecentQueriesByUser(user, since);
    }
    
    @Transactional
    public AiAssistanceLog createAiAssistanceLog(User user, String question, String knowledgePoint) {
        AiAssistanceLog log = new AiAssistanceLog();
        log.setUser(user);
        log.setQuestion(question);
        log.setKnowledgePoint(knowledgePoint);
        
        return aiAssistanceLogRepository.save(log);
    }
    
    @Transactional
    public AiAssistanceLog updateAiAssistanceLogWithAnswer(Long id, String answer) {
        Optional<AiAssistanceLog> optionalLog = aiAssistanceLogRepository.findById(id);
        
        if (optionalLog.isPresent()) {
            AiAssistanceLog log = optionalLog.get();
            log.setAnswer(answer);
            log.setAnswered(true);
            
            return aiAssistanceLogRepository.save(log);
        }
        
        throw new RuntimeException("AI Assistance Log not found with id: " + id);
    }
    
    public List<AiAssistanceLog> getAiAssistanceLogsByKnowledgePoint(String knowledgePoint) {
        return aiAssistanceLogRepository.findByKnowledgePointContaining(knowledgePoint);
    }
}