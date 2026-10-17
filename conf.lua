-- Love2D configuration / تنظیمات Love2D
function love.conf(t)
    t.identity = "the-great-rostam"          -- save directory / پوشه ذخیره‌سازی
    t.version = "11.5"
    t.console = false

    t.window.title = "The Great Rostam ⚔️"
    t.window.icon = nil                       -- TODO: assets/icon.png
    t.window.width = 1280
    t.window.height = 720
    t.window.borderless = false
    t.window.resizable = true
    t.window.minwidth = 960
    t.window.minheight = 540
    t.window.fullscreen = false
    t.window.vsync = 1
    t.window.highdpi = true

    t.modules.audio = true
    t.modules.event = true
    t.modules.graphics = true
    t.modules.image = true
    t.modules.joystick = true                 -- gamepad support later / پشتیبانی دسته در آینده
    t.modules.keyboard = true
    t.modules.math = true
    t.modules.mouse = true
    t.modules.physics = false                 -- simple custom physics for now / فعلاً فیزیک ساده
    t.modules.sound = true
    t.modules.system = true
    t.modules.thread = true
    t.modules.timer = true
    t.modules.touch = true                    -- mobile-friendly future / آماده برای موبایل
    t.modules.video = true
    t.modules.window = true
end
