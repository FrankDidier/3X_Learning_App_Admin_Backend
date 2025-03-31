package com.x3.app.payload.request;

import lombok.Data;

import java.util.List;

@Data
public class QuizAttemptRequest {
    
    private Long attemptId;
    private List<UserAnswerRequest> answers;
    
    @Data
    public static class UserAnswerRequest {
        private Long questionId;
        private String selectedOption;
        private boolean correct;
    }
}