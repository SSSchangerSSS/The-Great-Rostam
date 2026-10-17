-- =============================================================
--  THE GREAT ROSTAM ⚔️ — 2D action game inspired by Shahnameh
--  Starter skeleton: menu + playable placeholder + combat stub
--  اسکلت اولیه بازی: منو + بازیکن قابل کنترل + پایه‌ی مبارزه
--  Engine / موتور: Love2D 11.x
-- =============================================================

local GRAVITY = 2600          -- px/s^2 / شتاب جاذبه
local MOVE_SPEED = 340        -- px/s / سرعت حرکت
local JUMP_VELOCITY = -820    -- px/s / سرعت اولیه پرش

local game = {
    state = "menu",           -- "menu" | "playing"
    time = 0,
    menu = { selected = 1 },
    player = {},
    enemy = {},
    hits = 0,                 -- successful hits / ضربه‌های موفق
    flash = 0,                -- attack flash timer / فلش حمله
}

-- -------------------------------------------------------------
-- Init / راه‌اندازی اولیه
-- -------------------------------------------------------------
function love.load()
    love.window.setTitle("The Great Rostam ⚔️")
    reset_world()
end

function reset_world()
    game.player = {
        x = 160, y = 0,        -- y is computed from ground / y نسبت به زمین محاسبه می‌شود
        w = 34, h = 56,
        vx = 0, vy = 0,
        on_ground = true,
        facing = 1,            -- 1 = right, -1 = left
        color = { 0.9, 0.75, 0.2 },   -- tiger-skin gold / طلایی پوست ببر
    }
    game.enemy = {
        x = 760, y = 0,
        w = 38, h = 60,
        hp = 3,
        color = { 0.55, 0.1, 0.75 },  -- demon purple / بنفش دیو
        alive = true,
    }
    game.hits = 0
end

-- -------------------------------------------------------------
-- Update / به‌روزرسانی هر فریم
-- -------------------------------------------------------------
function love.update(dt)
    game.time = game.time + dt
    if game.state ~= "playing" then return end

    local p = game.player
    local ground_y = love.graphics.getHeight() - 120 - p.h

    -- horizontal movement / حرکت افقی
    p.vx = 0
    if love.keyboard.isDown("left", "a") then
        p.vx = -MOVE_SPEED; p.facing = -1
    elseif love.keyboard.isDown("right", "d") then
        p.vx = MOVE_SPEED; p.facing = 1
    end

    -- physics / فیزیک
    p.x = math.max(20, math.min(love.graphics.getWidth() - 20 - p.w, p.x + p.vx * dt))
    p.vy = p.vy + GRAVITY * dt
    p.y = p.y + p.vy * dt
    if p.y >= ground_y then
        p.y = ground_y
        p.vy = 0
        p.on_ground = true
    end

    -- simple demo enemy: walks toward player / دشمن ساده: به سمت بازیکن می‌آید
    local e = game.enemy
    if e.alive then
        local dir = (p.x > e.x) and 1 or -1
        e.x = e.x + dir * 70 * dt
        -- overlap = hit / برخورد = ضربه
        if game.flash > 0 and rects_overlap(p, e) then
            e.hp = e.hp - 1
            game.flash = 0
            game.hits = game.hits + 1
            if e.hp <= 0 then e.alive = false end -- TODO: respawn waves / موج بعدی
        end
    end

    if game.flash > 0 then game.flash = game.flash - dt end
end

function rects_overlap(a, b)
    return a.x < b.x + b.w and b.x < a.x + a.w and
           a.y < b.y + b.h and b.y < a.y + a.h
end

-- -------------------------------------------------------------
-- Input / ورودی‌ها
-- -------------------------------------------------------------
function love.keypressed(key)
    if game.state == "menu" then
        if key == "return" or key == "kpenter" or key == "space" then
            game.state = "playing"
            reset_world()
        elseif key == "escape" then
            love.event.quit()
        end
    elseif game.state == "playing" then
        if key == "z" or key == "space" then
            local p = game.player
            if p.on_ground then
                p.vy = JUMP_VELOCITY      -- jump / پرش
                p.on_ground = false
            end
        elseif key == "x" then
            game.flash = 0.18             -- mace attack / حمله با گرز
        elseif key == "escape" then
            game.state = "menu"           -- back to menu / بازگشت به منو
        end
    end
end

-- -------------------------------------------------------------
-- Draw / ترسیم
-- -------------------------------------------------------------
function love.draw()
    if game.state == "menu" then
        draw_menu()
    else
        draw_world()
    end
end

function draw_background()
    local w, h = love.graphics.getWidth(), love.graphics.getHeight()
    -- night sky / آسمان شب
    love.graphics.clear(0.04, 0.03, 0.08)
    -- stars / ستاره‌ها
    love.graphics.setColor(1, 1, 1, 0.5)
    for i = 0, 40 do
        local sx = (i * 137) % w
        local sy = (i * 89) % (h - 200)
        local tw = (math.sin(game.time * 2 + i) + 1) / 2
        love.graphics.setColor(1, 1, 1, 0.15 + 0.45 * tw)
        love.graphics.points(sx, sy)
    end
    -- distant dunes / تپه‌های دور
    love.graphics.setColor(0.10, 0.07, 0.14)
    love.graphics.polygon("fill", 0, h - 90, w * 0.25, h - 150, w * 0.5, h - 95, w * 0.75, h - 160, w, h - 100, w, h, 0, h)
    -- ground / زمین
    love.graphics.setColor(0.16, 0.11, 0.06)
    love.graphics.rectangle("fill", 0, h - 120, w, 120)
    love.graphics.setColor(0.35, 0.26, 0.12)
    love.graphics.rectangle("fill", 0, h - 120, w, 4)
end

function draw_menu()
    local w, h = love.graphics.getWidth(), love.graphics.getHeight()
    draw_background()
    love.graphics.push()
    love.graphics.translate(0, 0)

    love.graphics.setColor(1, 0.84, 0.25)
    love.graphics.print("THE GREAT ROSTAM", (w - love.graphics.getFont():getWidth("THE GREAT ROSTAM") * 2.4) / 2, h * 0.28, 0, 2.4, 2.4)
    love.graphics.setColor(1, 1, 1)
    love.graphics.print("⚔️  A 2D Action Game Inspired by Shahnameh", (w - 460) / 2, h * 0.28 + 92)
    love.graphics.print("بازی اکشن دوبعدی بر اساس رستم شاهنامه", (w - 420) / 2, h * 0.28 + 122)

    -- blinking prompt / پیام چشمک‌زن
    if math.sin(game.time * 4) > -0.2 then
        love.graphics.setColor(0, 1, 0.35)
        love.graphics.print("PRESS ENTER TO BEGIN — برای شروع اینتر بزنید", (w - 480) / 2, h * 0.62)
    end

    love.graphics.setColor(1, 1, 1, 0.6)
    love.graphics.print("Move: ← → | Jump: Z | Attack: X |_quit: Esc", (w - 400) / 2, h - 60)
    love.graphics.pop()
end

function draw_world()
    local w, h = love.graphics.getWidth(), love.graphics.getHeight()
    draw_background()

    -- player (placeholder hero) / قهرمان موقت
    local p = game.player
    love.graphics.setColor(p.color)
    love.graphics.rectangle("fill", p.x, p.y, p.w, p.h, 4)
    love.graphics.setColor(0.1, 0.1, 0.1)
    love.graphics.rectangle("fill", p.x + (p.facing == 1 and p.w - 12 or 4), p.y + 10, 8, 8, 2) -- eye/چشم
    if game.flash > 0 then
        -- mace swing arc / قوس ضربه گرز
        love.graphics.setColor(1, 1, 0.4, game.flash / 0.18)
        love.graphics.arc("line", "open", p.x + p.w / 2, p.y + p.h / 2, 46,
            p.facing == 1 and -1.1 or math.pi - 1.1, p.facing == 1 and 1.1 or math.pi + 1.1, 12)
    end

    -- enemy (placeholder demon) / دیو موقت
    local e = game.enemy
    if e.alive then
        love.graphics.setColor(e.color)
        love.graphics.rectangle("fill", e.x, e.y + 4, e.w, e.h, 4)
        love.graphics.setColor(1, 0.2, 0.2)
        love.graphics.points(e.x + 10, e.y + 18, e.x + e.w - 10, e.y + 18) -- red eyes/چشم‌های قرمز
    end

    -- HUD
    love.graphics.setColor(1, 0.84, 0.25)
    love.graphics.print("ROSTAM", 20, 16, 0, 1.4, 1.4)
    love.graphics.setColor(1, 1, 1)
    love.graphics.print("Hits: " .. game.hits, 140, 18)
    if not e.alive then
        love.graphics.setColor(0, 1, 0.35)
        love.graphics.print("DEMON SLAIN! — دیو کشته شد! (wave system: TODO)", w / 2 - 190, h * 0.4)
    end
end
