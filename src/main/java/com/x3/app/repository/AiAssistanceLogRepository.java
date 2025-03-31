package com.x3.app.repository;

import com.x3.app.model.AiAssistanceLog;
import com.x3.app.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AiAssistanceLogRepository extends JpaRepository<AiAssistanceLog, Long> {
    List<AiAssistanceLog> findByUser(User user);
    List<AiAssistanceLog> findByUserOrderByCreatedAtDesc(User user);
    List<AiAssistanceLog> findByAnsweredFalse();
    
    @Query("SELECT COUNT(a) FROM AiAssistanceLog a WHERE a.user = ?1 AND a.createdAt > ?2")
    Long countRecentQueriesByUser(User user, LocalDateTime since);
    
    @Query("SELECT a FROM AiAssistanceLog a WHERE a.knowledgePoint LIKE %?1%")
    List<AiAssistanceLog> findByKnowledgePointContaining(String knowledgePoint);
}