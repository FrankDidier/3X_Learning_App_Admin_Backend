package com.x3.app.service;

import com.aliyun.dysmsapi20170525.Client;
import com.aliyun.dysmsapi20170525.models.SendSmsRequest;
import com.aliyun.dysmsapi20170525.models.SendSmsResponse;
import com.aliyun.teaopenapi.models.Config;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Random;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class SmsService {
    
    private final StringRedisTemplate redisTemplate;
    
    @Value("${aliyun.sms.access-key-id}")
    private String accessKeyId;
    
    @Value("${aliyun.sms.access-key-secret}")
    private String accessKeySecret;
    
    @Value("${aliyun.sms.sign-name}")
    private String signName;
    
    @Value("${aliyun.sms.template-code}")
    private String templateCode;
    
    private Client createClient() throws Exception {
        Config config = new Config()
                .setAccessKeyId(accessKeyId)
                .setAccessKeySecret(accessKeySecret);
        config.endpoint = "dysmsapi.aliyuncs.com";
        return new Client(config);
    }
    
    public boolean sendVerificationCode(String phoneNumber) {
        try {
            // Generate a 6-digit verification code
            String code = generateVerificationCode();
            
            // Store the code in Redis with a 5-minute expiration
            String redisKey = "sms:verification:" + phoneNumber;
            redisTemplate.opsForValue().set(redisKey, code, 5, TimeUnit.MINUTES);
            
            // Send the SMS
            Client client = createClient();
            SendSmsRequest request = new SendSmsRequest()
                    .setPhoneNumbers(phoneNumber)
                    .setSignName(signName)
                    .setTemplateCode(templateCode)
                    .setTemplateParam("{\"code\":\"" + code + "\"}");
            
            SendSmsResponse response = client.sendSms(request);
            return "OK".equals(response.body.code);
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }
    
    public boolean verifyCode(String phoneNumber, String code) {
        String redisKey = "sms:verification:" + phoneNumber;
        String storedCode = redisTemplate.opsForValue().get(redisKey);
        
        if (storedCode != null && storedCode.equals(code)) {
            // Delete the code after successful verification
            redisTemplate.delete(redisKey);
            return true;
        }
        
        return false;
    }
    
    private String generateVerificationCode() {
        Random random = new Random();
        int code = 100000 + random.nextInt(900000); // 6-digit code
        return String.valueOf(code);
    }
}