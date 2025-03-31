package com.x3.app.repository;

import com.x3.app.model.OperationLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface OperationLogRepository extends JpaRepository<OperationLog, Long> {
    List<OperationLog> findByUserId(Long userId);
    List<OperationLog> findByOperationType(String operationType);
    
    @Query("SELECT o FROM OperationLog o WHERE o.createdAt BETWEEN ?1 AND ?2")
    List<OperationLog> findByDateRange(LocalDateTime startDate, LocalDateTime endDate);
    
    @Query("SELECT o FROM OperationLog o WHERE o.userId = ?1 AND o.operationType = ?2")
    List<OperationLog> findByUserIdAndOperationType(Long userId, String operationType);
}