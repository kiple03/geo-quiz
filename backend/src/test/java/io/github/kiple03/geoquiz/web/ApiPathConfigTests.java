package io.github.kiple03.geoquiz.web;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Every REST controller is served under /api, without naming the prefix itself. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(ApiPathConfigTests.PingController.class)
class ApiPathConfigTests {

  /** Test-only controller; nested in a test class, so other tests' component scans skip it. */
  @RestController
  static class PingController {
    @GetMapping("/ping")
    String ping() {
      return "pong";
    }
  }

  @Autowired private MockMvcTester mvc;

  @Test
  void controllersAreServedUnderApi() {
    assertThat(mvc.get().uri("/api/ping")).hasStatusOk().hasBodyTextEqualTo("pong");
  }

  @Test
  void controllersAreNotServedWithoutThePrefix() {
    assertThat(mvc.get().uri("/ping")).hasStatus(HttpStatus.NOT_FOUND);
  }
}
