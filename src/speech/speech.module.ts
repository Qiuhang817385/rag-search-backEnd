import { Module } from '@nestjs/common';
import { SpeechService } from './speech.service';
import { SpeechGateway } from './speech.gateway';
import { WhisperCliService } from './whisper.service';
import { AsrService } from './asr.service';
@Module({
  providers: [SpeechGateway, SpeechService, WhisperCliService, AsrService],
})
export class SpeechModule {}
