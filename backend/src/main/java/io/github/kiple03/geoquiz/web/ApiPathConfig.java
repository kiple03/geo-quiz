package io.github.kiple03.geoquiz.web;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.method.HandlerTypePredicate;
import org.springframework.web.servlet.config.annotation.PathMatchConfigurer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Serves every {@code @RestController} under {@value #API_PREFIX}, the one prefix the Vite dev
 * proxy forwards (ADR 0010). Controllers map paths without it: {@code @GetMapping("/scores")} is
 * served at {@code /api/scores}.
 */
@Configuration
public class ApiPathConfig implements WebMvcConfigurer {

  public static final String API_PREFIX = "/api";

  @Override
  public void configurePathMatch(PathMatchConfigurer configurer) {
    configurer.addPathPrefix(API_PREFIX, HandlerTypePredicate.forAnnotation(RestController.class));
  }
}
