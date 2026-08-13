FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -q
COPY src ./src
RUN mvn package -DskipTests -q

FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
RUN addgroup --system war && adduser --system --ingroup war war
COPY --from=build /app/target/*.jar app.jar
RUN chown war:war app.jar
USER war
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
