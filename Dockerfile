FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY RedGpsExam.csproj ./
RUN dotnet restore RedGpsExam.csproj

COPY . ./
RUN dotnet publish RedGpsExam.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

ENV PORT=8080
ENV DATA_DIR=/app/data
ENV ASPNETCORE_ENVIRONMENT=Production

COPY --from=build /app/publish ./

EXPOSE 8080
ENTRYPOINT ["dotnet", "RedGpsExam.dll"]
