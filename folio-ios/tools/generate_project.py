"""Generate a dependency-free Xcode project deterministically on Windows or macOS."""
from pathlib import Path
import hashlib

ROOT = Path(__file__).resolve().parents[1]
objects = {}
def ident(name): return hashlib.sha1(name.encode()).hexdigest()[:24].upper()
def obj(name, value):
    key = ident(name); objects[key] = value; return key
def array(values): return '(' + ', '.join(values) + (',)' if values else ')')
def quoted(text): return '"'+text.replace('\\', '\\\\').replace('"', '\\"')+'"'
def buildfile(name, ref): return obj('build:'+name, '{isa = PBXBuildFile; fileRef = '+ref+';}')
def ref(name, path, kind): return obj('ref:'+name, '{isa = PBXFileReference; lastKnownFileType = '+kind+'; path = '+quoted(path)+'; sourceTree = "<group>";}')
def configs(name, settings):
    values=[]
    for mode in ['Debug', 'Release']:
        extra = ' SWIFT_ACTIVE_COMPILATION_CONDITIONS = DEBUG; SWIFT_OPTIMIZATION_LEVEL = "-Onone";' if mode=='Debug' else ' SWIFT_OPTIMIZATION_LEVEL = "-O";'
        values.append(obj(name+':'+mode, '{isa = XCBuildConfiguration; buildSettings = {'+settings+extra+'}; name = '+mode+';}'))
    return obj(name+':configs', '{isa = XCConfigurationList; buildConfigurations = '+array(values)+'; defaultConfigurationIsVisible = 0; defaultConfigurationName = Release;}')

sources=[]; children=[]
for file in sorted((ROOT/'Folio').glob('*.swift')):
    path=file.relative_to(ROOT).as_posix();r=ref(path,path,'sourcecode.swift');children.append(r);sources.append(buildfile(path,r))
resources=[]
for path in ['Generated/WebAssets','Generated/QA','Folio/Resources']:
    r=ref(path,path,'folder');children.append(r);resources.append(buildfile(path,r))
children.append(ref('Info.plist','Folio/Info.plist','text.plist.xml'))
testref=ref('test','FolioUITests/FolioSmokeTests.swift','sourcecode.swift');children.append(testref)
appProduct=obj('appProduct','{isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = Folio.app; sourceTree = BUILT_PRODUCTS_DIR;}')
testProduct=obj('testProduct','{isa = PBXFileReference; explicitFileType = wrapper.cfbundle; includeInIndex = 0; path = FolioUITests.xctest; sourceTree = BUILT_PRODUCTS_DIR;}')
products=obj('products','{isa = PBXGroup; children = '+array([appProduct,testProduct])+'; name = Products; sourceTree = "<group>";}')
main=obj('main','{isa = PBXGroup; children = '+array(children+[products])+'; sourceTree = "<group>";}')
def phase(name, isa, files): return obj(name,'{isa = '+isa+'; buildActionMask = 2147483647; files = '+array(files)+'; runOnlyForDeploymentPostprocessing = 0;}')
appPhases=[phase('sources','PBXSourcesBuildPhase',sources),phase('frameworks','PBXFrameworksBuildPhase',[]),phase('resources','PBXResourcesBuildPhase',resources)]
testPhases=[phase('testSources','PBXSourcesBuildPhase',[buildfile('test',testref)]),phase('testFrameworks','PBXFrameworksBuildPhase',[]),phase('testResources','PBXResourcesBuildPhase',[])]
common='CLANG_ENABLE_MODULES = YES; IPHONEOS_DEPLOYMENT_TARGET = 17.0; SDKROOT = iphoneos; SWIFT_VERSION = 5.0; TARGETED_DEVICE_FAMILY = 1; CODE_SIGN_STYLE = Automatic;'
appConfig=configs('app',common+' PRODUCT_BUNDLE_IDENTIFIER = app.folio.ios.validation; PRODUCT_NAME = "$(TARGET_NAME)"; INFOPLIST_FILE = Folio/Info.plist;')
testConfig=configs('test',common+' PRODUCT_BUNDLE_IDENTIFIER = app.folio.ios.validation.uitests; PRODUCT_NAME = "$(TARGET_NAME)"; GENERATE_INFOPLIST_FILE = YES; TEST_TARGET_NAME = Folio;')
projectConfig=configs('project','ALWAYS_SEARCH_USER_PATHS = NO;')
proxy=obj('proxy','{isa = PBXContainerItemProxy; containerPortal = '+ident('project')+'; proxyType = 1; remoteGlobalIDString = '+ident('app')+'; remoteInfo = Folio;}')
dependency=obj('dependency','{isa = PBXTargetDependency; target = '+ident('app')+'; targetProxy = '+proxy+';}')
app=obj('app','{isa = PBXNativeTarget; buildConfigurationList = '+appConfig+'; buildPhases = '+array(appPhases)+'; buildRules = (); dependencies = (); name = Folio; productName = Folio; productReference = '+appProduct+'; productType = "com.apple.product-type.application";}')
test=obj('test','{isa = PBXNativeTarget; buildConfigurationList = '+testConfig+'; buildPhases = '+array(testPhases)+'; buildRules = (); dependencies = '+array([dependency])+'; name = FolioUITests; productName = FolioUITests; productReference = '+testProduct+'; productType = "com.apple.product-type.bundle.ui-testing";}')
project=obj('project','{isa = PBXProject; attributes = {LastUpgradeCheck = 1640;}; buildConfigurationList = '+projectConfig+'; compatibilityVersion = "Xcode 14.0"; developmentRegion = zh_CN; hasScannedForEncodings = 0; knownRegions = (en, zh_CN, Base); mainGroup = '+main+'; productRefGroup = '+products+'; projectDirPath = ""; projectRoot = ""; targets = '+array([app,test])+';}')
output='// !$*UTF8*$!\n{archiveVersion = 1; classes = {}; objectVersion = 56; objects = {\n'
output+='\n'.join(key+' = '+value+';' for key,value in objects.items())+'\n}; rootObject = '+project+';}\n'
folder=ROOT/'Folio.xcodeproj';folder.mkdir(exist_ok=True);(folder/'project.pbxproj').write_text(output,encoding='utf-8')
def reference(target, product, name): return f'<BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="{target}" BuildableName="{product}" BlueprintName="{name}" ReferencedContainer="container:Folio.xcodeproj"/>'
appRef=reference(app,'Folio.app','Folio');testRef=reference(test,'FolioUITests.xctest','FolioUITests')
scheme=f'''<?xml version="1.0" encoding="UTF-8"?>
<Scheme LastUpgradeVersion="1640" version="1.3">
<BuildAction parallelizeBuildables="YES" buildImplicitDependencies="YES"><BuildActionEntries>
<BuildActionEntry buildForTesting="YES" buildForRunning="YES" buildForProfiling="YES" buildForArchiving="YES" buildForAnalyzing="YES">{appRef}</BuildActionEntry>
<BuildActionEntry buildForTesting="YES" buildForRunning="NO" buildForProfiling="NO" buildForArchiving="NO" buildForAnalyzing="NO">{testRef}</BuildActionEntry>
</BuildActionEntries></BuildAction>
<TestAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB" shouldUseLaunchSchemeArgsEnv="YES"><Testables><TestableReference skipped="NO">{testRef}</TestableReference></Testables></TestAction>
<LaunchAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB" launchStyle="0" useCustomWorkingDirectory="NO" ignoresPersistentStateOnLaunch="NO" debugDocumentVersioning="YES" debugServiceExtension="internal" allowLocationSimulation="YES"><BuildableProductRunnable runnableDebuggingMode="0">{appRef}</BuildableProductRunnable></LaunchAction>
<ProfileAction buildConfiguration="Release" shouldUseLaunchSchemeArgsEnv="YES" savedToolIdentifier="" useCustomWorkingDirectory="NO" debugDocumentVersioning="YES"><BuildableProductRunnable runnableDebuggingMode="0">{appRef}</BuildableProductRunnable></ProfileAction>
<AnalyzeAction buildConfiguration="Debug"/><ArchiveAction buildConfiguration="Release" revealArchiveInOrganizer="YES"/></Scheme>'''
shared=folder/'xcshareddata/xcschemes';shared.mkdir(parents=True,exist_ok=True);(shared/'Folio.xcscheme').write_text(scheme,encoding='utf-8')
print('Generated Folio.xcodeproj,',len(objects),'objects')
