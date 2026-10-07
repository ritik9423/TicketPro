package com.ticketpro.api;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.web.config.EnableSpringDataWebSupport;
import org.springframework.data.web.config.EnableSpringDataWebSupport.PageSerializationMode;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.io.File;

@SpringBootApplication
@EnableScheduling
@EnableAsync
@EnableSpringDataWebSupport(pageSerializationMode = PageSerializationMode.VIA_DTO)
public class TicketProApplication {

    static {
        loadEnv();
    }

    /**
     * Loads .env environment variables into System properties before Spring context initializes.
     * Ensures consistent environment variable availability across both application runtime and tests.
     */
    public static void loadEnv() {
        try {
            Dotenv dotenv = null;
            if (new File("backend/.env").exists()) {
                dotenv = Dotenv.configure().directory("backend").ignoreIfMissing().load();
            } else if (new File(".env").exists()) {
                dotenv = Dotenv.configure().ignoreIfMissing().load();
            } else if (new File("../.env").exists()) {
                dotenv = Dotenv.configure().directory("..").ignoreIfMissing().load();
            } else {
                dotenv = Dotenv.configure().ignoreIfMissing().load();
            }

            if (dotenv != null) {
                dotenv.entries().forEach(entry -> {
                    if (System.getProperty(entry.getKey()) == null) {
                        System.setProperty(entry.getKey(), entry.getValue());
                    }
                });
            }
        } catch (Exception e) {
            System.out.println("[NOTICE] Could not load .env file: " + e.getMessage() + " — relying on system/env properties.");
        }
    }

    public static void main(String[] args) {
        loadEnv();
        SpringApplication.run(TicketProApplication.class, args);
    }
}
