FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY RedGpsExam.csproj ./
RUN dotnet restore

COPY . ./
RUN dotnet publish RedGpsExam.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app

COPY --from=build /app/publish ./

ENV ASPNETCORE_ENVIRONMENT=Production
ENV DATA_DIR=/var/data

EXPOSE 8080
ENTRYPOINT ["dotnet", "RedGpsExam.dll"]
