FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY RedGpsExam.csproj ./
RUN dotnet restore

COPY . ./
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app

ENV ASPNETCORE_ENVIRONMENT=Production
ENV PORT=8080

COPY --from=build /app/publish ./
RUN mkdir -p /app/data

EXPOSE 8080
ENTRYPOINT ["dotnet", "RedGpsExam.dll"]
