// graphX native output. Blackmagic SDK headers retain their original license.
#include "vendor/DeckLinkAPI.h"
#include <algorithm>
#include <atomic>
#include <chrono>
#include <cstring>
#include <iostream>
#include <mutex>
#include <string>
#include <thread>
#include <vector>
#include <unistd.h>
#include <signal.h>
constexpr int W=1920,H=1080; constexpr size_t BYTES=size_t(W)*H*4;
static std::mutex logMutex;
static void emit(const std::string&s){std::lock_guard<std::mutex>l(logMutex);std::cout<<s<<std::endl;}
static std::string quote(const std::string&s){std::string o="\"";for(unsigned char c:s){if(c=='"'||c=='\\'){o+='\\';o+=c;}else if(c<32)o+=' ';else o+=c;}return o+'"';}
static std::string str(CFStringRef s){if(!s)return "";std::vector<char>b(CFStringGetMaximumSizeForEncoding(CFStringGetLength(s),kCFStringEncodingUTF8)+1);CFStringGetCString(s,b.data(),b.size(),kCFStringEncodingUTF8);CFRelease(s);return b.data();}
struct Mode{double fps;BMDDisplayMode mode;};
static Mode modes[]={{25,bmdModeHD1080p25},{30,bmdModeHD1080p30},{50,bmdModeHD1080p50},{59.94,bmdModeHD1080p5994},{60,bmdModeHD1080p6000}};
static std::string deviceId(IDeckLink*d,int index){IDeckLinkProfileAttributes*a=nullptr;int64_t id=0;if(d->QueryInterface(IID_IDeckLinkProfileAttributes,(void**)&a)==S_OK){a->GetInt(BMDDeckLinkPersistentID,&id);a->Release();}return id?std::to_string(id):"index-"+std::to_string(index);}
static bool external(IDeckLink*d){IDeckLinkProfileAttributes*a=nullptr;bool flag=false;if(d->QueryInterface(IID_IDeckLinkProfileAttributes,(void**)&a)==S_OK){a->GetFlag(BMDDeckLinkSupportsExternalKeying,&flag);a->Release();}return flag;}
static std::string scan(){
 auto it=CreateDeckLinkIteratorInstance();if(!it)return "{\"driver\":false,\"devices\":[],\"message\":\"Pilote Desktop Video absent ou incompatible.\"}";
 std::string result="{\"driver\":true,\"devices\":[";IDeckLink*d=nullptr;int index=0;bool first=true;
 while(it->Next(&d)==S_OK){IDeckLinkOutput*out=nullptr;if(d->QueryInterface(IID_IDeckLinkOutput,(void**)&out)==S_OK){CFStringRef name=nullptr;d->GetDisplayName(&name);if(!first)result+=",";first=false;
 result+="{\"id\":"+quote(deviceId(d,index))+",\"name\":"+quote(str(name))+",\"externalKey\":"+(external(d)?"true":"false")+",\"modes\":[";bool fm=true;
 for(auto m:modes){bool ok=false;BMDDisplayMode actual;out->DoesSupportVideoMode(bmdVideoConnectionSDI,m.mode,bmdFormat8BitBGRA,bmdNoVideoOutputConversion,bmdSupportedVideoModeKeying,&actual,&ok);if(ok){if(!fm)result+=",";fm=false;result+=std::to_string(m.fps);}}
 result+="]}";out->Release();}d->Release();++index;}
 it->Release();return result+"]}";
}
static void unpremultiply(uint8_t*p,size_t n){for(size_t i=0;i<n;i+=4){unsigned a=p[i+3];for(int c=0;c<3;c++)p[i+c]=a?std::min(255u,(unsigned(p[i+c])*255+a/2)/a):0;}}
class Output:public IDeckLinkVideoOutputCallback{
 public:
 std::atomic<ULONG>refs{1};std::atomic<bool>running{false};std::atomic<uint64_t>completed{0},late{0},dropped{0},errors{0},received{0};
 std::mutex mutex;std::vector<uint8_t>latest=std::vector<uint8_t>(BYTES,0);IDeckLinkOutput*out=nullptr;IDeckLinkKeyer*keyer=nullptr;IDeckLink*device=nullptr;
 std::vector<IDeckLinkMutableVideoFrame*>pool;BMDTimeValue duration=1,next=0;BMDTimeScale scale=50;
 HRESULT QueryInterface(REFIID iid,LPVOID*ppv)override{if(!ppv)return E_INVALIDARG;CFUUIDBytes u=CFUUIDGetUUIDBytes(IUnknownUUID);if(memcmp(&iid,&IID_IDeckLinkVideoOutputCallback,sizeof(iid))==0||memcmp(&iid,&u,sizeof(iid))==0){*ppv=static_cast<IDeckLinkVideoOutputCallback*>(this);AddRef();return S_OK;}*ppv=nullptr;return E_NOINTERFACE;}
 ULONG AddRef()override{return ++refs;}ULONG Release()override{return --refs;}
 HRESULT ScheduledPlaybackHasStopped()override{return S_OK;}
 HRESULT ScheduledFrameCompleted(IDeckLinkVideoFrame*frame,BMDOutputFrameCompletionResult result)override{
  if(!running)return S_OK;if(result==bmdOutputFrameDisplayedLate)++late;else if(result==bmdOutputFrameDropped)++dropped;
  ++completed;void*ptr=nullptr;if(frame->GetBytes(&ptr)!=S_OK||!ptr){++errors;return S_OK;}
  {std::lock_guard<std::mutex>lock(mutex);memcpy(ptr,latest.data(),BYTES);}
  BMDTimeValue stream=0;double speed=1;if(out->GetScheduledStreamTime(scale,&stream,&speed)==S_OK&&next<=stream)next=((stream/duration)+2)*duration;
  if(out->ScheduleVideoFrame(frame,next,duration,scale)!=S_OK)++errors;next+=duration;return S_OK;
 }
 void start(const std::string&id,double fps,bool levelA){
  BMDDisplayMode mode=bmdModeUnknown;for(auto m:modes)if(m.fps==fps)mode=m.mode;if(mode==bmdModeUnknown)throw std::string("Cadence non prise en charge.");
  auto it=CreateDeckLinkIteratorInstance();if(!it)throw std::string("Pilote Desktop Video introuvable.");IDeckLink*d=nullptr;int index=0;
  while(it->Next(&d)==S_OK){if(deviceId(d,index)==id){device=d;break;}d->Release();++index;}it->Release();if(!device)throw std::string("UltraStudio introuvable. Actualise la liste des périphériques.");
  if(!external(device))throw std::string("Ce périphérique ne propose pas le keying externe.");
  if(device->QueryInterface(IID_IDeckLinkOutput,(void**)&out)!=S_OK||device->QueryInterface(IID_IDeckLinkKeyer,(void**)&keyer)!=S_OK)throw std::string("Interface Blackmagic indisponible.");
  bool supported=false;BMDDisplayMode actual;out->DoesSupportVideoMode(bmdVideoConnectionSDI,mode,bmdFormat8BitBGRA,bmdNoVideoOutputConversion,bmdSupportedVideoModeKeying,&actual,&supported);
  if(!supported)throw std::string("Ce mode 1080p BGRA avec keying n’est pas accepté par le pilote.");
  IDeckLinkDisplayMode*display=nullptr;if(out->GetDisplayMode(mode,&display)!=S_OK)throw std::string("Format vidéo introuvable.");display->GetFrameRate(&duration,&scale);display->Release();
  IDeckLinkConfiguration*cfg=nullptr;if(device->QueryInterface(IID_IDeckLinkConfiguration,(void**)&cfg)==S_OK){auto hr=cfg->SetFlag(bmdDeckLinkConfigSMPTELevelAOutput,levelA);if(hr!=S_OK)emit("{\"event\":\"warning\",\"message\":\"Le réglage SDI Level A/B n’a pas pu être appliqué ; vérifier Desktop Video Setup.\"}");cfg->Release();}
  if(out->EnableVideoOutput(mode,bmdVideoOutputFlagDefault)!=S_OK)throw std::string("Impossible d’ouvrir la sortie. Ferme les autres applications utilisant l’UltraStudio.");
  if(keyer->Enable(true)!=S_OK||keyer->SetLevel(255)!=S_OK)throw std::string("Activation du keyer externe impossible.");
  if(out->SetScheduledFrameCompletionCallback(this)!=S_OK)throw std::string("Impossible de programmer la sortie vidéo.");
  for(int i=0;i<4;i++){IDeckLinkMutableVideoFrame*f=nullptr;if(out->CreateVideoFrame(W,H,W*4,bmdFormat8BitBGRA,bmdFrameFlagDefault,&f)!=S_OK)throw std::string("Allocation vidéo impossible.");pool.push_back(f);void*p=nullptr;f->GetBytes(&p);memset(p,0,BYTES);if(out->ScheduleVideoFrame(f,next,duration,scale)!=S_OK)throw std::string("Préchargement vidéo impossible.");next+=duration;}
  running=true;if(out->StartScheduledPlayback(0,scale,1.0)!=S_OK){running=false;throw std::string("Démarrage vidéo impossible.");}
 }
 void stop(){running=false;if(out){out->StopScheduledPlayback(0,nullptr,scale);out->SetScheduledFrameCompletionCallback(nullptr);if(keyer){keyer->SetLevel(0);keyer->Disable();}out->DisableVideoOutput();for(auto*f:pool)f->Release();pool.clear();out->Release();out=nullptr;}if(keyer){keyer->Release();keyer=nullptr;}if(device){device->Release();device=nullptr;}}
 ~Output(){stop();}
};
static bool readFrame(std::vector<uint8_t>&buffer){size_t pos=0;while(pos<buffer.size()){auto n=read(STDIN_FILENO,buffer.data()+pos,buffer.size()-pos);if(n<=0)return false;pos+=n;}return true;}
int main(int argc,char**argv){signal(SIGPIPE,SIG_IGN);
 if(argc==2&&std::string(argv[1])=="--list"){emit(scan());return 0;}
 if(argc==2&&std::string(argv[1])=="--pixel-test"){uint8_t p[]={32,64,128,128,10,20,30,0,1,2,3,255};unpremultiply(p,12);bool ok=p[0]==64&&p[1]==128&&p[2]==255&&p[4]==0&&p[8]==1;emit(ok?"{\"ok\":true}":"{\"ok\":false}");return ok?0:1;}
 if(argc==2&&std::string(argv[1])=="--inspect-frame"){std::vector<uint8_t>frame(BYTES);if(!readFrame(frame))return 2;size_t visible=0,partial=0;for(size_t i=3;i<BYTES;i+=4){if(frame[i])visible++;if(frame[i]&&frame[i]<255)partial++;}emit("{\"visiblePixels\":"+std::to_string(visible)+",\"partialAlphaPixels\":"+std::to_string(partial)+"}");return 0;}
 std::string id,alpha="premultiplied";double fps=50;bool levelA=true;for(int i=1;i+1<argc;i+=2){std::string arg=argv[i];if(arg=="--device")id=argv[i+1];else if(arg=="--fps")fps=std::stod(argv[i+1]);else if(arg=="--alpha")alpha=argv[i+1];else if(arg=="--level-a")levelA=std::string(argv[i+1])=="true";}
 if(id.empty()){emit("{\"event\":\"error\",\"message\":\"Périphérique requis.\"}");return 1;}
 Output output;try{output.start(id,fps,levelA);}catch(const std::string&e){emit("{\"event\":\"error\",\"message\":"+quote(e)+"}");return 1;}
 emit("{\"event\":\"started\",\"fps\":"+std::to_string(fps)+"}");
 std::atomic<bool>done{false};std::thread stats([&]{while(!done){std::this_thread::sleep_for(std::chrono::milliseconds(1000));if(done)break;emit("{\"event\":\"stats\",\"completed\":"+std::to_string(output.completed)+",\"late\":"+std::to_string(output.late)+",\"dropped\":"+std::to_string(output.dropped)+",\"errors\":"+std::to_string(output.errors)+",\"received\":"+std::to_string(output.received)+"}");}});
 std::vector<uint8_t>input(BYTES);while(readFrame(input)){if(alpha=="straight")unpremultiply(input.data(),input.size());{std::lock_guard<std::mutex>lock(output.mutex);output.latest.swap(input);}++output.received;}
 {std::lock_guard<std::mutex>lock(output.mutex);std::fill(output.latest.begin(),output.latest.end(),0);}std::this_thread::sleep_for(std::chrono::milliseconds(160));output.stop();done=true;stats.join();emit("{\"event\":\"stopped\"}");return 0;
}
