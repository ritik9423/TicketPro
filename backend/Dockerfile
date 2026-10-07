# Build Stage
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests -B

# Runtime Stage
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
RUN addgroup -S ticketpro && adduser -S ticketpro -G ticketpro \
    && mkdir -p /app/logs /app/uploads/attachments \
    && chown -R ticketpro:ticketpro /app
COPY --from=build --chown=ticketpro:ticketpro /app/target/*.jar app.jar
USER ticketpro
EXPOSE 8081
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
