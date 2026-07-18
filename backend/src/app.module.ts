import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TripsModule } from './modules/trips/trips.module';
import { ItineraryModule } from './modules/itinerary/itinerary.module';
import { PlanningModule } from './modules/planning/planning.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { ContentModule } from './modules/content/content.module';
import { PlacesModule } from './modules/places/places.module';

@Module({
  imports: [
    // Infrastructure
    PrismaModule,

    // Auth & Users
    AuthModule,
    UsersModule,

    // Core Business
    TripsModule,
    ItineraryModule,
    PlanningModule,

    // Data Providers
    QuotesModule,
    ContentModule,
    PlacesModule,
  ],
})
export class AppModule {}
