# Timewise Task Planner

Skapa en webbaserad mobilapp med html, css och javascript baserat på denna design.
1: Listans syfte är att synliggöra hur lång tid olika saker tar så att listan är möjlig att genomföra med den tid som finns.
2: Varje task i listan kan ha sub-tasks. 
3: När man gör en task uppskattar man hur lång tid den kommer ta, detta visas sedan med hur stort task-kortet är i list-vyn. 
4: I list-vyn kan man flytta task-korten upp och ner i listan för att ändra ordningen. Man kan även dra i botten av korten för att göra dem större eller mindre på höjden. Detta påverkar hur lång tid en task förväntas ta och styrs i 5-minuters inkrement.
5: När en sub-task checkas av läggs den i botten av subtasksen för den main-tasken
6: När man är inne i en main-task kan man ändra namnet på uppgiften genom att trycka på namnet

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/00b17475-8c4f-435a-9571-95e9e90832a8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
