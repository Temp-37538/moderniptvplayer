#!/usr/bin/env bash
# Generates the small media files the engine tests play. Needs ffmpeg with
# libx264, libx265, libvpx-vp9, libopus, libvorbis, ac3/eac3 encoders.
# Usage: scripts/make-fixtures.sh [output-dir]   (default: ./fixtures)
set -euo pipefail
out="${1:-fixtures}"
mkdir -p "$out/hls"
cd "$out"
q=(-loglevel error -y)
src=(-f lavfi -i "testsrc=duration=12:size=320x180:rate=15" -f lavfi -i "sine=frequency=440:duration=12")

echo "h264 + aac (plays everywhere)";        ffmpeg "${q[@]}" "${src[@]}" -c:v libx264 -preset ultrafast -c:a aac    -shortest h264_aac.mkv
echo "h264 + ac3 (browsers: no sound)";      ffmpeg "${q[@]}" "${src[@]}" -c:v libx264 -preset ultrafast -c:a ac3    -shortest h264_ac3.mkv
echo "hevc + aac (browsers: no picture)";    ffmpeg "${q[@]}" "${src[@]}" -c:v libx265 -preset ultrafast -c:a aac    -shortest hevc_aac.mkv
echo "hevc + e-ac3 (browsers: nothing)";     ffmpeg "${q[@]}" "${src[@]}" -c:v libx265 -preset ultrafast -c:a eac3   -shortest hevc_eac3.mkv

echo "two audio tracks (language switch)"
ffmpeg "${q[@]}" -f lavfi -i "testsrc=duration=12:size=320x180:rate=15" \
  -f lavfi -i "sine=frequency=440:duration=12" -f lavfi -i "sine=frequency=880:duration=12" \
  -map 0:v -map 1:a -map 2:a -c:v libx264 -preset ultrafast -c:a aac \
  -metadata:s:a:0 language=eng -metadata:s:a:1 language=fra -shortest multi_audio.mkv

echo "4K hevc + e-ac3, 8 s (heavy test, ~26 Mb/s)"
ffmpeg "${q[@]}" -f lavfi -i "testsrc2=duration=8:size=3840x2160:rate=24,noise=alls=20:allf=t" \
  -f lavfi -i "sine=frequency=440:duration=8" -c:v libx265 -preset ultrafast -b:v 25M \
  -x265-params log-level=error -c:a eac3 -shortest hevc4k_eac3.mkv

echo "HLS (fMP4, vp9 + opus), 12 s"
ffmpeg "${q[@]}" "${src[@]}" -c:v libvpx-vp9 -b:v 150k -g 30 -keyint_min 30 -c:a libopus -f hls \
  -hls_time 4 -hls_playlist_type vod -hls_segment_type fmp4 -hls_fmp4_init_filename init.mp4 \
  -hls_segment_filename 'hls/seg%d.m4s' hls/index.m3u8
echo "done: $(ls | wc -l) entries in $out"
