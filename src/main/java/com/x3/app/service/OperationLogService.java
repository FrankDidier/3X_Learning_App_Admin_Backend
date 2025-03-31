package com.x3.app.service;

import com.x3.app.model.OperationLog;
import com.x3.app.repository.OperationLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class OperationLogService {
    
    private final OperationLogRepository operationLogRepository;
    
    public List<OperationLog> getAllOperationLogs() {
        return operationLogRepository.findAll();
    }
    
    public Optional<OperationLog> getOperationLogById(Long id) {
        return operationLogRepository.findById(id);
    }
    
    public List<OperationLog> getOperationLogsByUserId(Long userId) {
        return operationLogRepository.findByUserId(userId);
    }
    
    public List<OperationLog> getOperationLogsByType(String operationType) {
        return operationLogRepository.findByOperationType(operationType);
    }
    
    public List<OperationLog> getOperationLogsByDateRange(LocalDateTime startDate, LocalDateTime endDate) {
        return operationLogRepository.findByDateRange(startDate, endDate);
    }
    
    public List<OperationLog> getOperationLogsByUserIdAndType(Long userId, String operationType) {
        return operationLogRepository.findByUserIdAndOperationType(userId, operationType);
    }
    
    @Transactional
    public OperationLog createOperationLog(String operationType, String operationDetails, Long userId, String ipAddress, String userAgent) {
        OperationLog log = new OperationLog();
        log.setOperationType(operationType);
        log.setOperationDetails(operationDetails);
        log.setUserId(userId);
        log.setIpAddress(ipAddress);
        log.setUserAgent(userAgent);
        
        return operationLogRepository.save(log);
    }
}